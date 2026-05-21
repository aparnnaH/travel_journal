'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-ink text-cream py-12 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-serif font-bold mb-4">Travel Journal</h3>
            <p className="text-cream/70 text-sm">
              Document your travels, collect memories, share adventures.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li>
                <Link href="#features" className="hover:text-gold transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Security
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-cream/70">
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-gold transition-colors">
                  Cookies
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-cream/20 pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <p className="text-sm text-cream/70">
              © 2024 Travel Journal. All rights reserved.
            </p>
            <div className="flex space-x-6 mt-4 sm:mt-0">
              <a
                href="https://twitter.com"
                className="text-cream/70 hover:text-gold transition-colors"
              >
                Twitter
              </a>
              <a
                href="https://instagram.com"
                className="text-cream/70 hover:text-gold transition-colors"
              >
                Instagram
              </a>
              <a
                href="https://facebook.com"
                className="text-cream/70 hover:text-gold transition-colors"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
