const Footer = () => {
  return (
    <footer className="border-t border-glass-border px-6 py-10">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
        <p>© 2026 Global Immigration Gateway. Secure, Private, Expedited.</p>
        <div className="flex gap-6">
          <a href="#" className="transition-colors duration-300 hover:text-foreground">Privacy Policy</a>
          <a href="#" className="transition-colors duration-300 hover:text-foreground">Terms of Service</a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
