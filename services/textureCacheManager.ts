import * as THREE from 'three';
import { TextureItem } from '../types';

/**
 * 快取項目結構
 */
export interface TextureCacheEntry {
  url: string;
  texture: THREE.Texture;
  byteSize: number;
  lastUsed: number;
  refCount: number; // 正在使用的 Mesh 數量
  pinned: boolean;  // 是否釘選保護
}

interface PreloadTask {
  url: string;
  isNormalMap: boolean;
  priority: number; // 數字越大優先度越高
  partName: string;
}

class TextureCacheManager {
  private cache = new Map<string, TextureCacheEntry>();
  private loadingPromises = new Map<string, Promise<THREE.Texture>>();
  private preloadQueue: PreloadTask[] = [];
  private activePreloadCount = 0;
  private totalMemoryBytes = 0;
  private currentActivePart: string | null = null;
  private imageBitmapLoader: THREE.ImageBitmapLoader;

  // 併發上限設定 (手機 3，桌機 4)
  private maxConcurrentLoads: number;
  // 快取預算 (手機 ~160MB，桌機 ~384MB)
  private cacheBudget: number;

  constructor() {
    // 獨立 LoadingManager，避免觸發全局 Drei useProgress
    const manager = new THREE.LoadingManager();
    this.imageBitmapLoader = new THREE.ImageBitmapLoader(manager);
    this.imageBitmapLoader.setOptions({ imageOrientation: 'none' });

    const isMobile = typeof window !== 'undefined' && (
      window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
    const deviceMemory = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : undefined;

    if (isMobile || (deviceMemory && deviceMemory <= 4)) {
      this.maxConcurrentLoads = 3;
      this.cacheBudget = 160 * 1024 * 1024; // 160 MB 安全上限
    } else {
      this.maxConcurrentLoads = 4;
      this.cacheBudget = 384 * 1024 * 1024; // 384 MB 桌機上限
    }
  }

  /**
   * 估算貼圖在 GPU 中的記憶體大小 (RGBA = 4 bytes/pixel, Mipmaps factor ≈ 1.33)
   */
  private estimateBytes(image: { width?: number; height?: number } | null | undefined): number {
    const w = image?.width || 1024;
    const h = image?.height || 1024;
    return Math.round(w * h * 4 * 1.33);
  }

  /**
   * 取得快取狀態資訊 (除錯與效能診斷用)
   */
  public getStats() {
    return {
      cachedCount: this.cache.size,
      totalMemoryMB: (this.totalMemoryBytes / 1024 / 1024).toFixed(1),
      budgetMB: (this.cacheBudget / 1024 / 1024).toFixed(0),
      activeLoads: this.activePreloadCount,
      queueLength: this.preloadQueue.length
    };
  }

  /**
   * 載入或獲取 Texture (具備去重、記憶體快取與共用 Promise)
   */
  public loadTexture(url: string, isNormalMap = false): Promise<THREE.Texture> {
    if (!url) return Promise.reject(new Error("URL is empty"));

    // 1. 若快取已有，直接命中回傳 (0ms)
    const existing = this.cache.get(url);
    if (existing) {
      existing.lastUsed = Date.now();
      return Promise.resolve(existing.texture);
    }

    // 2. 若當前已有相同的 loading request，共用原本 Promise
    const inFlight = this.loadingPromises.get(url);
    if (inFlight) {
      return inFlight;
    }

    // 3. 建立新的載入請求
    const promise = new Promise<THREE.Texture>((resolve, reject) => {
      this.imageBitmapLoader.load(
        url,
        (imageBitmap) => {
          const texture = new THREE.Texture(imageBitmap);
          texture.flipY = false;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          if (!isNormalMap) {
            texture.colorSpace = THREE.SRGBColorSpace;
          }
          texture.generateMipmaps = true;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.needsUpdate = true;

          const byteSize = this.estimateBytes(imageBitmap);
          const entry: TextureCacheEntry = {
            url,
            texture,
            byteSize,
            lastUsed: Date.now(),
            refCount: 0,
            pinned: false
          };

          this.cache.set(url, entry);
          this.totalMemoryBytes += byteSize;
          this.loadingPromises.delete(url);

          // 執行 LRU 清理檢查
          this.evictIfNeeded();

          resolve(texture);
        },
        undefined,
        (err) => {
          console.warn(`[TextureCache] Failed to load texture: ${url}`, err);
          this.loadingPromises.delete(url);
          reject(err);
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  /**
   * 引用計數增加 (Mesh 套用時調用)
   */
  public retainTexture(url?: string | null): void {
    if (!url) return;
    const entry = this.cache.get(url);
    if (entry) {
      entry.refCount++;
      entry.lastUsed = Date.now();
    }
  }

  /**
   * 引用計數減少 (Mesh 卸下材質或替換時調用)
   */
  public releaseTexture(url?: string | null): void {
    if (!url) return;
    const entry = this.cache.get(url);
    if (entry) {
      entry.refCount = Math.max(0, entry.refCount - 1);
      entry.lastUsed = Date.now();
      this.evictIfNeeded();
    }
  }

  /**
   * 釘選貼圖 (防止被 LRU 清理)
   */
  public pinTexture(url: string): void {
    const entry = this.cache.get(url);
    if (entry) entry.pinned = true;
  }

  /**
   * 取消釘選貼圖
   */
  public unpinTexture(url: string): void {
    const entry = this.cache.get(url);
    if (entry) {
      entry.pinned = false;
      this.evictIfNeeded();
    }
  }

  /**
   * LRU 快取清理：當超過記憶體預算時，釋放最久未使用且 refCount === 0 的貼圖
   */
  private evictIfNeeded(): void {
    if (this.totalMemoryBytes <= this.cacheBudget) return;

    // 篩選出未在使用中 (refCount <= 0 且未釘選) 的項目
    const unreferenced = Array.from(this.cache.values()).filter(
      (entry) => entry.refCount <= 0 && !entry.pinned
    );

    // 依最後使用時間昇序排列 (最久未使用的排前面)
    unreferenced.sort((a, b) => a.lastUsed - b.lastUsed);

    for (const entry of unreferenced) {
      if (this.totalMemoryBytes <= this.cacheBudget) break;

      entry.texture.dispose();
      this.cache.delete(entry.url);
      this.totalMemoryBytes -= entry.byteSize;
    }
  }

  /**
   * 根據使用者選取的部位，背景執行排程預載 (On-Demand Preload)
   * 優先順序：
   * 1. 該部位當前選中的貼圖 (優先度 300)
   * 2. 前 2-3 套材質 (優先度 200)
   * 3. 剩餘材質 (優先度 100)
   */
  public preloadPartTextures(
    textures: TextureItem[],
    partName: string,
    activeUrl?: string | null
  ): void {
    this.currentActivePart = partName;

    // 清除隊列中非當前部位、且尚未開始的低優先任務 (支援 Preload cancellation)
    this.preloadQueue = this.preloadQueue.filter(
      (task) => task.partName === partName
    );

    // 加入當前部位的材質任務
    textures.forEach((t, index) => {
      let priority = 100;
      if (t.url === activeUrl) {
        priority = 300; // 最高優先
      } else if (index < 3) {
        priority = 200; // 次高優先 (首屏可見)
      }

      // 加入 Color 貼圖
      if (t.url && !this.cache.has(t.url) && !this.loadingPromises.has(t.url)) {
        if (!this.preloadQueue.some((q) => q.url === t.url)) {
          this.preloadQueue.push({
            url: t.url,
            isNormalMap: false,
            priority,
            partName
          });
        }
      }

      // 加入 Normal 貼圖
      if (t.normalUrl && !this.cache.has(t.normalUrl) && !this.loadingPromises.has(t.normalUrl)) {
        if (!this.preloadQueue.some((q) => q.url === t.normalUrl)) {
          this.preloadQueue.push({
            url: t.normalUrl,
            isNormalMap: true,
            priority,
            partName
          });
        }
      }
    });

    // 依優先度由大到小排序
    this.preloadQueue.sort((a, b) => b.priority - a.priority);

    // 開始抽取並執行佇列
    this.processQueue();
  }

  /**
   * 提升特定 URL 的載入優先級至最高 (當使用者點選了尚未載入完成的材質時)
   */
  public boostPriority(url: string): void {
    const taskIndex = this.preloadQueue.findIndex((t) => t.url === url);
    if (taskIndex !== -1) {
      const [task] = this.preloadQueue.splice(taskIndex, 1);
      task.priority = 1000;
      this.preloadQueue.unshift(task);
      this.processQueue();
    }
  }

  /**
   * 處理預載佇列 (嚴格控制併發數 MAX_CONCURRENT_LOADS)
   */
  private processQueue(): void {
    while (
      this.activePreloadCount < this.maxConcurrentLoads &&
      this.preloadQueue.length > 0
    ) {
      const task = this.preloadQueue.shift();
      if (!task) break;

      // 如果該 URL 已在快取中，跳過
      if (this.cache.has(task.url)) {
        continue;
      }

      this.activePreloadCount++;
      this.loadTexture(task.url, task.isNormalMap)
        .catch(() => {})
        .finally(() => {
          this.activePreloadCount--;
          // 排入微任務分批處理，避免在同一 frame 集中塞滿 GPU
          if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            (window as any).requestIdleCallback(() => this.processQueue());
          } else {
            setTimeout(() => this.processQueue(), 16);
          }
        });
    }
  }

  /**
   * 模型切換時清理：釋放所有未被引用的舊模型貼圖，重置預載佇列
   */
  public onModelSwitch(): void {
    this.preloadQueue = [];
    const unreferenced = Array.from(this.cache.values()).filter(
      (entry) => entry.refCount <= 0 && !entry.pinned
    );
    for (const entry of unreferenced) {
      entry.texture.dispose();
      this.cache.delete(entry.url);
      this.totalMemoryBytes -= entry.byteSize;
    }
  }

  /**
   * 判斷某貼圖是否已存在快取中
   */
  public has(url: string): boolean {
    return this.cache.has(url);
  }
}

// 導出全域單例
export const textureCacheManager = new TextureCacheManager();
