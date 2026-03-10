import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config.js';
import { query } from '../database/index.js';
import { serviceMap } from '../serviceMap.js';
import type { DbPricingConfig, DbHiddenPackage, DbPackagePricing } from '../types.js';

const router = Router();

// BaoStar API client (server-side only, API key hidden)
const baostarApi = axios.create({
    baseURL: config.baostar.domain,
    headers: {
        'Content-Type': 'application/json',
        'api-key': config.baostar.apiKey,
    },
});

// ============================================
// Price Cache — In-memory with 5-minute TTL
// ============================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
let priceCache: { data: any; timestamp: number } | null = null;
let isFetching = false;

async function fetchBaoStarPrices(): Promise<any> {
    const { data } = await baostarApi.get('/api/prices', { timeout: 15000 });
    return data;
}

async function getCachedPrices(): Promise<{ data: any; fromCache: boolean }> {
    const now = Date.now();

    // Cache hit and still fresh
    if (priceCache && (now - priceCache.timestamp) < CACHE_TTL_MS) {
        return { data: priceCache.data, fromCache: true };
    }

    // Cache miss or expired — fetch from BaoStar
    if (!isFetching) {
        isFetching = true;
        try {
            const freshData = await fetchBaoStarPrices();
            priceCache = { data: freshData, timestamp: now };
            return { data: freshData, fromCache: false };
        } catch (err) {
            // BaoStar down — serve stale cache if available
            if (priceCache) {
                console.warn('⚠️  BaoStar unreachable, serving stale cache');
                return { data: priceCache.data, fromCache: true };
            }
            throw err;
        } finally {
            isFetching = false;
        }
    }

    // Another request is already fetching — wait a bit then retry
    await new Promise(resolve => setTimeout(resolve, 500));
    if (priceCache) return { data: priceCache.data, fromCache: true };
    throw new Error('Prices unavailable');
}

// Background refresh on startup
(async () => {
    try {
        await getCachedPrices();
        console.log('🔄 Price cache refreshed');
    } catch {
        console.warn('⚠️  Background price refresh failed');
    }
})();

// ============================================
// GET /api/prices — Public, with markup applied + hidden filtered
// ============================================
router.get('/prices', async (_req: Request, res: Response) => {
    try {
        const { data, fromCache } = await getCachedPrices();

        // Get markups
        const allPricing = (await query('SELECT service_id, markup FROM pricing_config')).rows as DbPricingConfig[];
        const markupMap: Record<string, number> = {};
        allPricing.forEach(p => { markupMap[p.service_id] = p.markup; });

        // Get hidden packages
        const allHidden = (await query('SELECT service_id, package_name, original_price FROM hidden_packages')).rows as DbHiddenPackage[];
        const hiddenSet = new Set(allHidden.map(h => `${h.service_id}::${h.package_name}::${h.original_price}`));

        // Get per-package markups and fixed prices
        const allPkgPricing = (await query('SELECT service_id, package_name, original_price, markup, fixed_price FROM package_pricing')).rows as DbPackagePricing[];
        const pkgMarkupMap: Record<string, number> = {};
        const pkgFixedPriceMap: Record<string, number | null> = {};
        allPkgPricing.forEach(p => {
            pkgMarkupMap[`${p.service_id}::${p.package_name}::${p.original_price}`] = p.markup;
            pkgFixedPriceMap[`${p.service_id}::${p.package_name}::${p.original_price}`] = p.fixed_price;
        });

        // Deep clone to avoid mutating cache
        const result = JSON.parse(JSON.stringify(data));

        if (result.data && Array.isArray(result.data)) {
            result.data = result.data.map((cat: any) => {
                const serviceId = serviceMap[cat.path] || cat.path;
                const markup = markupMap[serviceId] || 1.5;

                return {
                    ...cat,
                    package: (cat.package || [])
                        // Filter hidden
                        .filter((pkg: any) => !hiddenSet.has(`${serviceId}::${pkg.package_name}::${pkg.price_per}`))
                        // Apply markup
                        .map((pkg: any) => {
                            const pkgKey = `${serviceId}::${pkg.package_name}::${pkg.price_per}`;
                            const effectiveMarkup = pkgMarkupMap[pkgKey] ?? markup;
                            const fixedPrice = pkgFixedPriceMap[pkgKey] ?? null;
                            const sellPrice = fixedPrice !== null ? fixedPrice : Math.ceil(pkg.price_per * effectiveMarkup);
                            return {
                                ...pkg,
                                original_price: pkg.price_per,
                                sell_price: sellPrice,
                                price_per: sellPrice,
                            };
                        }),
                };
            });
        }

        // Set cache header
        if (fromCache) res.setHeader('X-Cache', 'HIT');
        res.json(result);
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: 'Không thể lấy danh sách gói dịch vụ',
        });
    }
});

// ============================================
// POST /api/convert-uid — Public
// ============================================
router.post('/convert-uid', async (req: Request, res: Response) => {
    try {
        const { link, type } = req.body;

        if (!link || typeof link !== 'string') {
            res.status(400).json({ success: false, message: 'Link là bắt buộc' });
            return;
        }

        const cleanLink = link.trim();
        if (cleanLink.length > 500 || /<[a-z][\s\S]*>/i.test(cleanLink)) {
            res.status(400).json({ success: false, message: 'Link không hợp lệ' });
            return;
        }

        // Only allow expected type values
        const allowedTypes = ['like', 'follow'];
        const safeType = allowedTypes.includes(type) ? type : 'like';

        const { data } = await baostarApi.post('/api/convert-uid', { link: cleanLink, type: safeType });
        res.json(data);
    } catch (err: any) {
        res.status(500).json({
            success: false,
            message: 'Không thể chuyển đổi link',
        });
    }
});

export { baostarApi, getCachedPrices };
export default router;
