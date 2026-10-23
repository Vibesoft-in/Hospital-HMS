

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-linear-gradiant">
        <div className="main-wrapper">
            {children}
        </div>
    </div>
  );
}