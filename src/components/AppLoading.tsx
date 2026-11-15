import MetroLoader from './MetroLoader';

interface Props {
  message?: string;
  fullScreen?: boolean;
}

/**
 * App-wide loading state. Delegates to the signature MetroLoader map:
 * fullScreen on route/bootstrap level, compact inside pages.
 */
export default function AppLoading({ message, fullScreen }: Props) {
  if (fullScreen) {
    return <MetroLoader surface="page" size="lg" message={message} className="min-h-screen" />;
  }
  return <MetroLoader surface="page" size="sm" message={message ?? 'جاري التحميل...'} className="py-16" />;
}
