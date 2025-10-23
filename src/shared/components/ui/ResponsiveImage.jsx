import React from 'react';
import PropTypes from 'prop-types';
import useImageOptimization from '@/shared/hooks/useImageOptimization';
import { Skeleton } from '../ui/skeleton';

/**
 * Componente de imagem responsiva com suporte a múltiplos formatos, carregamento lêvedo e placeholder
 * @param {Object} props - Propriedades do componente
 */
const ResponsiveImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = '100vw',
  lazy = true,
  placeholder: customPlaceholder,
  webpSrc,
  avifSrc,
  srcSet,
  fallbackSrc,
  showPlaceholder = true,
  ...rest
}) => {
  // Usa o hook de otimização para a imagem principal
  const {
    src: optimizedSrc,
    isLoading,
    hasError,
    retry
  } = useImageOptimization(src, {
    lazy,
    fallback: fallbackSrc
  });

  // Se estiver carregando e tiver um placeholder, mostra o placeholder
  if ((isLoading || hasError) && showPlaceholder && (customPlaceholder || width || height)) {
    return (
      <div 
        className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}
        style={width || height ? { width, height } : {}}
      >
        {customPlaceholder ? (
          <img 
            src={customPlaceholder} 
            alt="" 
            className="w-full h-full object-cover"
            aria-hidden="true" 
          />
        ) : (
          <Skeleton className="w-full h-full" />
        )}
      </div>
    );
  }

  // Se houver erro e não houver fallback, retorna null ou uma mensagem de erro
  if (hasError && !fallbackSrc) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 ${className}`}
        style={width || height ? { width, height } : {}}
      >
        <span>Erro ao carregar a imagem</span>
      </div>
    );
  }

  // Se tivermos suporte a múltiplos formatos, usamos o elemento <picture>
  if (webpSrc || avifSrc) {
    return (
      <picture className={className}>
        {/* Ordem dos sources: formatos mais eficientes primeiro */}
        {avifSrc && (
          <source 
            srcSet={avifSrc} 
            type="image/avif"
            sizes={sizes}
          />
        )}
        {webpSrc && (
          <source 
            srcSet={webpSrc} 
            type="image/webp"
            sizes={sizes}
          />
        )}
        {/* Imagem de fallback */}
        <img
          src={optimizedSrc}
          alt={alt}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          className={className}
          srcSet={srcSet}
          sizes={sizes}
          onError={retry}
          {...rest}
        />
      </picture>
    );
  }

  // Para imagens simples sem múltiplos formatos
  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      className={className}
      srcSet={srcSet}
      sizes={sizes}
      onError={retry}
      {...rest}
    />
  );
};

ResponsiveImage.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  sizes: PropTypes.string,
  lazy: PropTypes.bool,
  placeholder: PropTypes.string,
  webpSrc: PropTypes.string,
  avifSrc: PropTypes.string,
  srcSet: PropTypes.string,
  fallbackSrc: PropTypes.string,
  showPlaceholder: PropTypes.bool,
};

export default ResponsiveImage;
