import Svg, { Path, Rect, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

// Logo BlueTube.
// - variant 'inline' (default): [▶] BlueTube em uma unica linha (compacto).
// - variant 'stacked': play box a esquerda, "Blue" em cima e "Tube" embaixo,
//   com tagline opcional "CRIADOR VIRAL" — mesmo layout do splash/site.
export default function LogoBlueTube({
  width = 160,
  height = 48,
  showText = true,
  variant = 'inline',
  tagline = false,
}) {
  if (variant === 'stacked') {
    // viewBox 260x150 — play box 130x130 a esquerda, textos empilhados a direita
    return (
      <Svg width={width} height={height} viewBox="0 0 260 150">
        <Defs>
          <LinearGradient id="btGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#00c2ff" />
            <Stop offset="0.55" stopColor="#1a6bff" />
            <Stop offset="1" stopColor="#0a3ab0" />
          </LinearGradient>
          <LinearGradient id="btTubeGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8feaff" />
            <Stop offset="1" stopColor="#0aa9ff" />
          </LinearGradient>
        </Defs>
        <Rect x="6" y="14" width="120" height="120" rx="28" fill="url(#btGrad)" />
        <Rect x="12" y="20" width="108" height="108" rx="22" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
        <Path d="M 52 46 L 96 74 L 52 102 Z" fill="#ffffff" />
        {showText && (
          <>
            <SvgText x="140" y="62" fontSize="46" fontWeight="900" fill="#ffffff">Blue</SvgText>
            <SvgText x="140" y="110" fontSize="46" fontWeight="900" fill="url(#btTubeGrad)">Tube</SvgText>
            {tagline && (
              <SvgText x="140" y="134" fontSize="13" fontWeight="700" fill="#1a8fd6" letterSpacing="4">
                CRIADOR VIRAL
              </SvgText>
            )}
          </>
        )}
      </Svg>
    );
  }

  // variant inline (default)
  const vbW = showText ? 160 : 48;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${vbW} 48`}>
      <Defs>
        <LinearGradient id="btGradInline" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#1a6bff" />
          <Stop offset="1" stopColor="#00aaff" />
        </LinearGradient>
      </Defs>
      <Rect x="4" y="4" width="40" height="40" rx="10" fill="url(#btGradInline)" />
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
