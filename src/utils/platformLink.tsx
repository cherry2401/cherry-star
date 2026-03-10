import { Copy } from 'lucide-react';
import toast from 'react-hot-toast';

type Platform = 'facebook' | 'tiktok' | 'instagram' | 'unknown';

/** Detect platform from service_id naming convention */
function detectPlatform(serviceId: string): Platform {
    const sid = serviceId.toLowerCase();
    if (sid.startsWith('tiktok-') || sid.startsWith('tiktok_')) return 'tiktok';
    if (sid.startsWith('instagram-') || sid.startsWith('instagram_')) return 'instagram';
    // All remaining services (like-gia-re, like-chat-luong, binh-luan, follow, etc.) are Facebook
    return 'facebook';
}

/** Build a platform-appropriate URL from a raw object_id */
function buildPlatformUrl(objectId: string, platform: Platform): string | null {
    // If it's already a full URL, return as-is
    if (/^https?:\/\//i.test(objectId)) return objectId;

    switch (platform) {
        case 'facebook':
            return `https://facebook.com/${objectId}`;
        case 'tiktok':
            // TikTok object_ids are usually full URLs (https://tiktok.com/@user/video/123)
            // If it's just an ID number, we can't reliably build a TikTok link
            if (/^\d+$/.test(objectId)) return null; // pure numeric = can't build link
            return `https://tiktok.com/${objectId}`;
        case 'instagram':
            // Instagram object_ids are usually full URLs
            // If it's just an ID, we can't reliably build an IG link
            if (/^\d+$/.test(objectId)) return null;
            return `https://instagram.com/${objectId}`;
        default:
            return null;
    }
}

interface PlatformLinkProps {
    serviceId: string;
    objectId: string;
    /** Max characters to display before truncating (default: 40) */
    maxLen?: number;
}

/** Renders a platform-aware link for order object_id, with copy fallback */
export function PlatformLink({ serviceId, objectId, maxLen = 40 }: PlatformLinkProps) {
    const platform = detectPlatform(serviceId);
    const url = buildPlatformUrl(objectId, platform);
    const displayText = objectId.length > maxLen ? objectId.slice(0, maxLen) + '…' : objectId;

    const handleCopy = () => {
        navigator.clipboard.writeText(objectId);
        toast.success('Đã copy ID');
    };

    if (url) {
        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-uid"
                title={url}
            >
                {displayText}
            </a>
        );
    }

    // Fallback: show ID + copy button (no broken link)
    return (
        <span className="link-uid-fallback" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span title={objectId}>{displayText}</span>
            <button
                className="btn-copy-id"
                onClick={handleCopy}
                title="Copy ID"
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 2,
                    color: 'var(--text-secondary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                }}
            >
                <Copy size={13} />
            </button>
        </span>
    );
}
