import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Linkedin, Instagram, Youtube, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer id="footer" className="w-full bg-background text-foreground py-12 border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-blue-800 bg-clip-text text-transparent">
                TamanduAI
              </span>
            </div>
            <p className="text-muted-foreground max-w-md">
              Revolucionando a educação através da inteligência artificial.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-4">Produto</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/#features" className="hover:text-foreground transition-colors">
                  Recursos
                </Link>
              </li>
              <li>
                <Link to="/docs" className="hover:text-foreground transition-colors">
                  Documentação
                </Link>
              </li>
              <li>
                <Link to="/roadmap" className="hover:text-foreground transition-colors">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-foreground transition-colors">
                  Preços
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-4">Suporte</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>
                <Link to="/contact" className="hover:text-foreground transition-colors">
                  Contato
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-foreground transition-colors">
                  Privacidade
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Social links */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="text-sm text-muted-foreground text-center md:text-left">
            Siga a TamanduAI nas redes sociais
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com/company/tamanduai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-blue-600 transition-colors"
              aria-label="LinkedIn da TamanduAI"
            >
              <Linkedin className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href="https://www.instagram.com/tamanduai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-pink-600 transition-colors"
              aria-label="Instagram da TamanduAI"
            >
              <Instagram className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href="https://www.youtube.com/@tamanduai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-red-600 transition-colors"
              aria-label="YouTube da TamanduAI"
            >
              <Youtube className="w-5 h-5" aria-hidden="true" />
            </a>
            <a
              href="https://x.com/tamanduai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X (Twitter) da TamanduAI"
            >
              <Twitter className="w-5 h-5" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="border-t border-border pt-8 text-center text-muted-foreground">
          <p>© 2025 TamanduAI. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
