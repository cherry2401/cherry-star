/**
 * Maps BaoStar API path → internal service_id.
 * Used by both /api/prices and /admin/pricing-detail endpoints.
 */
export const serviceMap: Record<string, string> = {
    '/facebook-like-gia-re': 'like-gia-re',
    '/facebook-like-chat-luong': 'like-chat-luong',
    '/facebook-like-binh-luan': 'like-comment',
    '/facebook-binh-luan': 'comment',
    '/facebook-follow': 'follow',
    '/facebook-like-page': 'like-page',
    '/facebook-mem-group': 'mem-group',
    '/facebook-eyes': 'mat-live',
    '/facebook-share': 'share',
    '/facebook-vip-clone': 'vip',
    '/tiktok-like': 'tiktok-like',
    '/tiktok-follow': 'tiktok-follow',
    '/tiktok-view': 'tiktok-view',
    '/tiktok-save': 'tiktok-save',
    '/tiktok-comment': 'tiktok-comment',
    '/tiktok-share': 'tiktok-share',
    '/tiktok-live': 'tiktok-live',
    '/tiktok-vip-mat': 'tiktok-vip-mat',
    '/instagram-like': 'instagram-like',
    '/instagram-follow': 'instagram-follow',
    '/instagram-comment': 'instagram-comment',
    '/instagram-view': 'instagram-view',
    '/instagram-view-story': 'instagram-view-story',
    '/instagram-vip-like': 'instagram-vip-like',
};
