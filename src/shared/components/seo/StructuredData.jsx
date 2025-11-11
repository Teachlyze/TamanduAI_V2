import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * StructuredData Component
 * Adiciona JSON-LD Schema.org para melhorar SEO e GEO (Generative Engine Optimization)
 * Torna o site mais compreensível para IAs como ChatGPT e Google AI Overviews
 */
export const StructuredData = ({ type, data }) => {
  const schemas = {
    organization: {
      "@context": "https://schema.org",
      "@type": "EducationalOrganization",
      "name": "TamanduAI",
      "alternateName": "Tamanduá AI",
      "url": "https://tamanduai.com",
      "logo": "https://tamanduai.com/logo.png",
      "description": "Plataforma educacional com inteligência artificial que automatiza correções, detecta plágio com Winston AI, oferece chatbot educacional com RAG e analytics para professores e alunos",
      "foundingDate": "2025",
      "areaServed": {
        "@type": "Country",
        "name": "Brasil"
      },
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+55",
        "contactType": "customer support",
        "email": "support@tamanduai.com",
        "availableLanguage": ["Portuguese", "pt-BR"]
      },
      "knowsAbout": [
        "Educação com IA",
        "Correção Automática",
        "Detecção de Plágio",
        "Winston AI",
        "Chatbot Educacional",
        "RAG (Retrieval-Augmented Generation)",
        "Analytics Educacional",
        "Gestão de Turmas",
        "LGPD",
        "GDPR"
      ]
    },

    software: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "TamanduAI - Plataforma Educacional com IA",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web Browser",
      "browserRequirements": "Requires JavaScript. Suporta Chrome, Firefox, Safari, Edge",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "BRL",
        "availability": "https://schema.org/InStock",
        "priceValidUntil": "2026-12-31"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.8",
        "ratingCount": "127",
        "bestRating": "5",
        "worstRating": "1"
      },
      "featureList": [
        "Correção automática de atividades com IA",
        "Detecção de plágio com Winston AI (100 verificações/hora)",
        "Chatbot educacional com RAG v2.0 (200 mensagens/dia grátis)",
        "Analytics em tempo real com exportação CSV",
        "Gestão completa de turmas e alunos",
        "Calendário de eventos e aulas recorrentes",
        "Sistema de submissões e notas automáticas",
        "Importação de atividades (TXT, PDF, DOCX, ODT)",
        "Conformidade LGPD e GDPR 100%"
      ]
    },

    article: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": data?.title || "TamanduAI",
      "description": data?.description || "Plataforma educacional com IA",
      "author": {
        "@type": "Organization",
        "name": "TamanduAI"
      },
      "publisher": {
        "@type": "Organization",
        "name": "TamanduAI",
        "logo": {
          "@type": "ImageObject",
          "url": "https://tamanduai.com/logo.png"
        }
      },
      "datePublished": data?.datePublished || "2025-11-10",
      "dateModified": data?.dateModified || "2025-11-10",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": data?.url || "https://tamanduai.com"
      }
    },

    faq: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": data?.questions?.map((q, i) => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.answer
        }
      })) || []
    },

    breadcrumb: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": data?.items?.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@id": item.url,
          "name": item.name
        }
      })) || []
    },

    howto: {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": data?.name || "Como usar TamanduAI",
      "description": data?.description || "Guia completo",
      "step": data?.steps?.map((step, index) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "name": step.name,
        "text": step.text,
        "url": step.url
      })) || []
    },

    course: {
      "@context": "https://schema.org",
      "@type": "Course",
      "name": data?.name,
      "description": data?.description,
      "provider": {
        "@type": "Organization",
        "name": "TamanduAI"
      },
      "educationalLevel": data?.level || "Todos os níveis",
      "inLanguage": "pt-BR",
      "availableLanguage": "Portuguese",
      "isAccessibleForFree": data?.isFree !== false
    },

    review: {
      "@context": "https://schema.org",
      "@type": "Review",
      "itemReviewed": {
        "@type": "SoftwareApplication",
        "name": "TamanduAI"
      },
      "author": {
        "@type": "Person",
        "name": data?.author
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": data?.rating,
        "bestRating": "5"
      },
      "reviewBody": data?.text
    }
  };

  const schemaData = schemas[type] || data;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

/**
 * SEO Component
 * Melhora SEO e GEO com meta tags otimizadas
 */
export const SEO = ({ 
  title = "TamanduAI - Plataforma Educacional com IA para Professores | Correção Automática, Chatbot RAG, Antiplágio",
  description = "Plataforma educacional brasileira com IA que automatiza correções (economia 70%), detecta plágio com Winston AI (100 checks/hora), chatbot RAG 24/7 (200 msgs/dia grátis). LGPD compliant. Usado por 127+ educadores.",
  keywords = "plataforma educacional IA, correção automática inteligência artificial, detecção plágio Winston AI, chatbot educacional RAG, analytics professores tempo real, gestão turmas online Brasil, LGPD educação, antiplágio IA, ensino híbrido tecnologia, EdTech Brasil, automação tarefas professores, software gestão alunos, corretor automático redações IA, plataforma EAD inteligente, ferramenta correção trabalhos escolares",
  image = "https://tamanduai.com/og-image.png",
  url = "https://tamanduai.com",
  type = "website",
  author = "TamanduAI",
  publishDate,
  modifiedDate
}) => {
  return (
    <Helmet>
      {/* Meta Tags Básicas */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content={author} />
      <link rel="canonical" href={url} />

      {/* Open Graph (Facebook, LinkedIn) - Completo */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="TamanduAI - Plataforma Educacional com IA" />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="TamanduAI" />
      <meta property="og:locale" content="pt_BR" />
      <meta property="og:locale:alternate" content="en_US" />
      {type === 'article' && publishDate && (
        <meta property="article:published_time" content={publishDate} />
      )}
      {type === 'article' && modifiedDate && (
        <meta property="article:modified_time" content={modifiedDate} />
      )}

      {/* Twitter Card - Completo */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content="TamanduAI Platform Dashboard" />
      <meta name="twitter:site" content="@tamanduai" />
      <meta name="twitter:creator" content="@tamanduai" />
      <meta name="twitter:label1" content="Preço" />
      <meta name="twitter:data1" content="Gratuito / R$ 29/mês" />
      <meta name="twitter:label2" content="Rating" />
      <meta name="twitter:data2" content="4.8/5 (127 reviews)" />

      {/* Datas (para GEO) */}
      {publishDate && <meta property="article:published_time" content={publishDate} />}
      {modifiedDate && <meta property="article:modified_time" content={modifiedDate} />}

      {/* Para IAs entenderem melhor */}
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />

      {/* Geo Tags - Completo */}
      <meta name="geo.region" content="BR" />
      <meta name="geo.placename" content="Brasil" />
      <meta name="geo.position" content="-15.793889;-47.882778" />
      <meta name="ICBM" content="-15.793889, -47.882778" />
      <meta name="language" content="Portuguese" />
      <meta name="country" content="Brazil" />
      <meta name="DC.title" content={title} />

      {/* Mobile - Completo */}
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      <meta name="apple-mobile-web-app-title" content="TamanduAI" />
      <meta name="theme-color" content="#3B82F6" />
      <meta name="msapplication-TileColor" content="#3B82F6" />
      <meta name="msapplication-TileImage" content="/mstile-144x144.png" />
      
      {/* Additional SEO */}
      <meta name="copyright" content="TamanduAI © 2025" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />
      <meta name="revisit-after" content="7 days" />
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      
      {/* Crawlers Específicos */}
      <meta name="GPTBot" content="index, follow" />
      <meta name="ChatGPT-User" content="index, follow" />
      <meta name="Google-Extended" content="index, follow" />
      <meta name="CCBot" content="index, follow" />
      <meta name="anthropic-ai" content="index, follow" />
    </Helmet>
  );
};

// Export both components
export default { StructuredData, SEO };
