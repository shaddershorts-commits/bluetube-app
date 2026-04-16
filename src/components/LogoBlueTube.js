import Svg, { Path, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

export default function LogoBlueTube({ width = 160, height = 48, showText = true }) {
  const vbW = showText ? 160 : 48;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vbW} 48`}>
      <Defs>
        <LinearGradient id="btGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1a6bff" />
          <Stop offset="1" stopColor="#00aaff" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="40" height="40" rx="10" fill="url(#btGrad)" />
      <Path d="M20 14 L34 24 L20 34 Z" fill="white" />
      {showText && (
        <>
          <SvgText x="54" y="31" fontSize="20" fontWeight="900" fill="#ffffff">Blue</SvgText>
          <SvgText x="106" y="31" fontSize="20" fontWeight="900" fill="#00aaff">Tube</SvgText>
        </>
      )}
    </Svg>
  );
}
