// Full-screen stop message (region blocked, under age).
export function Notice({ text }: { text: string }) {
  return (
    <div className="screen" role="alert">
      <div className="card"><p>{text}</p></div>
    </div>
  );
}
