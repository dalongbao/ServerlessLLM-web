interface DetailDisplayBoxProps {
  labelLines: string[];
  value: React.ReactNode;
}

const DetailDisplayBox = ({ labelLines, value }: DetailDisplayBoxProps) => {
  // Only render the component if there is a value to display.
  // This prevents empty boxes from appearing.
  if (!value) {
    return null;
  }

  return (
    <div className="border border-slate-600 bg-slate-900/50 px-3 py-2 flex items-center justify-start gap-4 rounded-md">
      {/* Left side: The stacked label text */}
      <div className="font-helvetica-narrow text-xs uppercase text-slate-400 leading-tight text-left">
        {labelLines.map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < labelLines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
      
      {/* Right side: The main value */}
      <div className="font-mono text-xl font-bold text-slate-200 leading-tight">
        {value}
      </div>
    </div>
  );
};
