import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#2D5A2B',
        }}
      >
        <svg
          width="140"
          height="140"
          viewBox="0 0 512 512"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M256 32C256 32 128 96 128 96C128 96 128 224 128 288C128 416 256 480 256 480C256 480 384 416 384 288C384 224 384 96 384 96C384 96 256 32 256 32Z"
            fill="#2D5A2B"
          />
          <path
            d="M352 176L224 304L160 240"
            stroke="#8BC34A"
            strokeWidth="48"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}