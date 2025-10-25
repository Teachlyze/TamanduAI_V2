import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * SEO Component
 * Manages meta tags for SEO optimization
 */
export default function Seo({ 
  title = 'TamanduAI — Plataforma Educacional com IA',
  description = 'Plataforma completa para gestão educacional com Inteligência Artificial, Analytics, Gamificação e muito mais.',
  path = '/',
  image = '/og-image.png',
  keywords = 'educação, IA, plataforma educacional, gestão escolar, chatbot educacional'
}) {
  const siteUrl = 'https://tamanduai.com';
  const fullUrl = `${siteUrl}${path}`;
  const fullImageUrl = image.startsWith('http') ? image : `${siteUrl}${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={fullImageUrl} />

      {/* Additional SEO */}
      <meta name="robots" content="index, follow" />
      <meta name="author" content="TamanduAI Team" />
      <meta name="language" content="Portuguese" />
    </Helmet>
  );
}
