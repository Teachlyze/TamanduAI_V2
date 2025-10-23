
const DefaultFallback = () => (
  <div className="w-full py-10 text-center text-gray-700 dark:text-gray-400">Carregando...</div>
);

export function LoadingSuspense({ children, fallback = <DefaultFallback /> }) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

export default LoadingSuspense;
