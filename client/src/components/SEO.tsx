import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description?: string;
  type?: string;
  image?: string;
  url?: string;
  canonical?: string;
}

export function SEO({ title, description, type = 'website', image, url, canonical }: SEOProps) {
  const siteName = 'Orderzi';
  const defaultDescription = 'The modern OS for restaurants. Menus, QR codes, and analytics in one place.';

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{title}</title>
      <meta name='description' content={description || defaultDescription} />
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph tags */}
      <meta property='og:title' content={title} />
      <meta property='og:description' content={description || defaultDescription} />
      <meta property='og:type' content={type} />
      <meta property='og:site_name' content={siteName} />
      {image && <meta property='og:image' content={image} />}
      {url && <meta property='og:url' content={url} />}

      {/* Twitter tags */}
      <meta name='twitter:creator' content='@orderzi' />
      <meta name='twitter:card' content={image ? 'summary_large_image' : 'summary'} />
      <meta name='twitter:title' content={title} />
      <meta name='twitter:description' content={description || defaultDescription} />
      {image && <meta name='twitter:image' content={image} />}
    </Helmet>
  );
}
