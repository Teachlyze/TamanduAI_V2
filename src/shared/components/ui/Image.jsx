import React, { useRef, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Componente de imagem otimizada com acessibilidade WCAG 2.2
 * Suporta múltiplas resoluções, formatos modernos e funcionalidades avançadas de acessibilidade
 */
const Image = ({
  src,
  alt,
  className = '',
  width,
  height,
  lazy = true,
  sizes,
  loading,
  style = {},
  basePath = 'src/assets/images',
  // Propriedades de acessibilidade adicionais
  caption,
  priority = false, // Para imagens acima da dobra
  decorative = false, // Para imagens puramente decorativas
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  // Remove o caminho base do src para evitar duplicação
  const cleanSrc = src.startsWith('/') ? src.slice(1) : src;
  const imgPath = cleanSrc.replace(/^\/|^src\/|^assets\/|^images\//g, '');

  // Gera o caminho para a imagem otimizada
  const optimizedSrc = `/generated/${imgPath}`;

  // Gera srcSet para múltiplas resoluções
  const generateSrcSet = (format) => {
    const widths = [640, 768, 1024, 1280, 1536];
    return widths
      .map((w) => {
        const ext = format === 'original' ? '' : `.${format}`;
        return `${optimizedSrc.replace(/\.(jpg|jpeg|png|webp|avif)$/, '')}@${w}w${ext} ${w}w`;
      })
      .join(', ');
  };

  // Determina o tipo MIME com base na extensão do arquivo
  const getMimeType = (src) => {
    const ext = src.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'avif':
        return 'image/avif';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      default:
        return 'image/jpeg';
    }
  };

  // Verifica se a imagem é SVG (não será otimizada)
  const isSvg = src.toLowerCase().endsWith('.svg');

  // Tratamento de erro de imagem
  const handleError = () => {
    setHasError(true);
    if (onError) onError();
  };

  // Tratamento de carregamento de imagem
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) onLoad();
  };

  // Tratamento de texto alternativo
  const getAccessibleAlt = () => {
    if (decorative) {
      return ''; // Imagens decorativas devem ter alt vazio
    }
    return alt || 'Imagem sem descrição alternativa';
  };

  // Tratamento de carregamento prioritário
  const getLoadingBehavior = () => {
    if (priority) return 'eager';
    return lazy ? 'lazy' : 'eager';
  };

  // Para imagens SVG, renderizar diretamente
  if (isSvg) {
    return (
      <figure className={className}>
        <img
          ref={imgRef}
          src={src}
          alt={getAccessibleAlt()}
          width={width}
          height={height}
          loading={getLoadingBehavior()}
          decoding="async"
          style={style}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
        {caption && (
          <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
            {caption}
          </figcaption>
        )}
      </figure>
    );
  }

  // Para imagens com erro
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 ${className}`}
        style={{ width, height, ...style }}
        role="img"
        aria-label={`Imagem não carregada: ${alt}`}
      >
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <figure className={className}>
      <picture>
        {/* AVIF - Melhor compressão, suporte mais limitado */}
        {!hasError && (
          <source
            type="image/avif"
            srcSet={generateSrcSet('avif')}
            sizes={sizes}
          />
        )}

        {/* WebP - Bom equilíbrio entre qualidade e suporte */}
        {!hasError && (
          <source
            type="image/webp"
            srcSet={generateSrcSet('webp')}
            sizes={sizes}
          />
        )}

        {/* Imagem original como fallback */}
        {!hasError && (
          <source
            srcSet={generateSrcSet('original')}
            sizes={sizes}
            type={getMimeType(src)}
          />
        )}

        {/* Fallback para navegadores antigos */}
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={getAccessibleAlt()}
          width={width}
          height={height}
          loading={getLoadingBehavior()}
          decoding={priority ? 'sync' : 'async'}
          style={style}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </picture>

      {/* Indicador de carregamento */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse"
          aria-label="Carregando imagem..."
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Caption para acessibilidade */}
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-600 dark:text-gray-400 text-center">
          {caption}
        </figcaption>
      )}

      {/* Screen reader only description for complex images */}
      {!decorative && alt && caption && (
        <div className="sr-only">
          Descrição detalhada: {caption}
        </div>
      )}
    </figure>
  );
};

Image.propTypes = {
  src: PropTypes.string.isRequired,
  alt: PropTypes.string,
  className: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lazy: PropTypes.bool,
  sizes: PropTypes.string,
  loading: PropTypes.oneOf(['lazy', 'eager']),
  style: PropTypes.object,
  basePath: PropTypes.string,
  caption: PropTypes.string,
  priority: PropTypes.bool,
  decorative: PropTypes.bool,
  onLoad: PropTypes.func,
  onError: PropTypes.func,
};

export default Image;
