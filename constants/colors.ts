/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#F2F1F7',
    tint: '#C45BFF',
    background: '#17181E',
    foreground: '#F2F1F7',
    card: '#22242D',
    cardForeground: '#F2F1F7',
    primary: '#C45BFF',
    primaryForeground: '#17181E',
    secondary: '#2B2E38',
    secondaryForeground: '#F2F1F7',
    muted: '#2B2E38',
    mutedForeground: '#A3A5B2',
    accent: '#33313B',
    accentForeground: '#F2F1F7',
    destructive: '#FF4FB8',
    destructiveForeground: '#17181E',
    border: '#393B47',
    input: '#40424F',
    purple: '#C45BFF',
    gold: '#FFD166',
    cyan: '#45E6F5',
    pink: '#FF4FB8',
    error: '#F23838',
    surfaceRaised: '#292B35',
    surfaceDeep: '#111217',
    glow: '#8D45C5',
  },
  dark: {
    text: '#F2F1F7',
    tint: '#C45BFF',
    background: '#17181E',
    foreground: '#F2F1F7',
    card: '#22242D',
    cardForeground: '#F2F1F7',
    primary: '#C45BFF',
    primaryForeground: '#17181E',
    secondary: '#2B2E38',
    secondaryForeground: '#F2F1F7',
    muted: '#2B2E38',
    mutedForeground: '#A3A5B2',
    accent: '#33313B',
    accentForeground: '#F2F1F7',
    destructive: '#FF4FB8',
    destructiveForeground: '#17181E',
    border: '#393B47',
    input: '#40424F',
    purple: '#C45BFF',
    gold: '#FFD166',
    cyan: '#45E6F5',
    pink: '#FF4FB8',
    error: '#F23838',
    surfaceRaised: '#292B35',
    surfaceDeep: '#111217',
    glow: '#8D45C5',
  },
  radius: 16,
};

export default colors;
