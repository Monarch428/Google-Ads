type SeoHeaderProps = {
  title?: string;
  subtitle?: string;
};
const SeoHeader = ({
  title = "SEO Dashboard",
  subtitle = "SEO Analyze Agent",
}: SeoHeaderProps) => {
  return (
    <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4.25">
      <div className="flex items-center justify-between">
        <div className="leading-tight">
          <h1 className="text-lg font-bold text-slate-800">{title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Active
        </div>
      </div>
    </div>
  );
};

export default SeoHeader;