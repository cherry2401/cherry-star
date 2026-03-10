import tiktokLogo from '../assets/tiktok.png';

interface TikTokIconProps {
    size?: number | string;
    className?: string;
    style?: React.CSSProperties;
}

export const TikTokIcon = ({ size = 24, className, style }: TikTokIconProps) => {
    return (
        <img
            src={tiktokLogo}
            alt="TikTok"
            width={size}
            height={size}
            className={className}
            style={{ objectFit: 'contain', ...style }}
        />
    );
};
