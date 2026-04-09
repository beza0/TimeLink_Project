import { Clock, Facebook, Twitter, Instagram, Linkedin, Mail } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

export function Footer() {
  const { t } = useLanguage();
  const f = t.footer;

  return (
    <footer className="border-t border-white/10 bg-zinc-950 py-12 px-4 text-zinc-100 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl">TimeLink</span>
            </div>
            <p className="mb-4 max-w-md text-zinc-400">
              {f.tagline}
            </p>
            <div className="flex gap-4">
              <a 
                href="#" 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-blue-600"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-blue-400"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-pink-600"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="#" 
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors duration-200 hover:bg-blue-700"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg mb-4">{f.quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.aboutUs}
                </a>
              </li>
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.howItWorks}
                </a>
              </li>
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.categories}
                </a>
              </li>
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.community}
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg mb-4">{f.legal}</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.privacy}
                </a>
              </li>
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.terms}
                </a>
              </li>
              <li>
                <a href="#" className="text-zinc-400 transition-colors duration-200 hover:text-white">
                  {f.contact}
                </a>
              </li>
              <li>
                <a href="#" className="flex items-center gap-2 text-zinc-400 transition-colors duration-200 hover:text-white">
                  <Mail className="w-4 h-4" />
                  {f.support}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 text-center text-zinc-500">
          <p>
            &copy; {new Date().getFullYear()} {f.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
