import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const dotRadius = 18;
  const gap = 12;
  const totalWidth = dotRadius * 6 + gap * 2;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f6f5f1",
      }}
    >
      <svg
        width={totalWidth}
        height={dotRadius * 2}
        viewBox={`0 0 ${totalWidth} ${dotRadius * 2}`}
      >
        <title>no-mess logo</title>
        <circle cx={dotRadius} cy={dotRadius} r={dotRadius} fill="#008e92" />
        <circle
          cx={dotRadius * 3 + gap}
          cy={dotRadius}
          r={dotRadius}
          fill="#f0503d"
        />
        <circle
          cx={dotRadius * 5 + gap * 2}
          cy={dotRadius}
          r={dotRadius}
          fill="#020202"
        />
      </svg>
    </div>,
    { ...size },
  );
}
