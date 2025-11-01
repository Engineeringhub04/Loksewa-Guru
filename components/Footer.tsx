import React from 'react';
import { FacebookIcon, InstagramIcon, TwitterIcon, LinkedInIcon } from '../constants';
import type { SocialLinks } from '../types';

interface FooterProps {
    socialLinks?: SocialLinks;
}

// Keep youtube/whatsapp in type for data consistency, but don't render them
const DEFAULT_SOCIAL_LINKS: SocialLinks = {
    facebook: '#',
    instagram: '#',
    youtube: '#',
    twitter: '#',
    linkedin: '#',
    whatsapp: '#',
};

const Footer: React.FC<FooterProps> = ({ socialLinks = DEFAULT_SOCIAL_LINKS }) => {
  return (
    <footer className="bg-[#0A102A] text-gray-300 py-12 px-4">
      <div className="max-w-md mx-auto text-center">
        <h2 className="text-3xl font-bold text-white mb-8">Follow us</h2>
        <div className="flex justify-center space-x-4 mb-10">
          <a href={socialLinks.facebook} aria-label="Facebook" className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-500/20 ring-1 ring-blue-500 transition-transform transform hover:scale-110 hover:ring-blue-400">
            <FacebookIcon className="h-7 w-7 text-blue-400" />
          </a>
          <a href={socialLinks.instagram} aria-label="Instagram" className="w-14 h-14 rounded-full flex items-center justify-center bg-pink-500/20 ring-1 ring-pink-500 transition-transform transform hover:scale-110 hover:ring-pink-400">
            <InstagramIcon className="h-7 w-7 text-pink-400" />
          </a>
          <a href={socialLinks.twitter} aria-label="Twitter" className="w-14 h-14 rounded-full flex items-center justify-center bg-sky-500/20 ring-1 ring-sky-500 transition-transform transform hover:scale-110 hover:ring-sky-400">
            <TwitterIcon className="h-6 w-6 text-sky-400" />
          </a>
          <a href={socialLinks.linkedin} aria-label="LinkedIn" className="w-14 h-14 rounded-full flex items-center justify-center bg-blue-600/20 ring-1 ring-blue-600 transition-transform transform hover:scale-110 hover:ring-blue-500">
            <LinkedInIcon className="h-7 w-7 text-blue-500" />
          </a>
        </div>
        <p className="mb-4">
          Contact us by <a href="mailto:noteshub00@gmail.com" className="text-blue-400 hover:underline">noteshub00@gmail.com</a>
        </p>
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Loksewa Guru. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
