export default function PageSpinner() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-500" />
    </div>
  );
}
