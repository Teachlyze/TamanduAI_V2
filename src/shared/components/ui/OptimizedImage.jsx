import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente de imagem otimizada com carregamento lêvedo e suporte a múltiplos formatos
 * @param {Object} props - Propriedades do componente
 * @param {string} props.src - URL da imagem (obrigatória para imagens estáticas)
 * @param {string} props.alt - Texto alternativo da imagem (obrigatório para acessibilidade)
 * @param {string} [props.className] - Classes CSS adicionais
 * @param {string} [props.width] - Largura da imagem
 * @param {string} [props.height] - Altura da imagem
 * @param {string} [props.sizes] - Atributo sizes para imagens responsivas
 * @param {boolean} [props.lazy=true] - Habilita/desabilita o carregamento lêvedo
 * @param {string} [props.placeholder] - URL da imagem de placeholder (opcional)
 * @param {string} [props.webpSrc] - URL da versão WebP da imagem (opcional)
 * @param {string} [props.avifSrc] - URL da versão AVIF da imagem (opcional)
 * @param {string} [props.srcSet] - Atributo srcset para imagens responsivas
 * @param {Object} [props.rest] - Outras propriedades HTML da imagem
 */
const OptimizedImage = ({
  src,
  alt,
  className = '',
  width,
  height,
  sizes = '100vw',
  lazy = true,
  placeholder,
  webpSrc,
  avifSrc,
  srcSet,
  ...rest
}) => {
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
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={lazy ? 'lazy' : 'eager'}
          decoding="async"
          className={className}
          srcSet={srcSet}
          sizes={sizes}
          {...rest}
        />
      </picture>
    );
  }

  // Para imagens simples sem múltiplos formatos
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={lazy ? 'lazy' : 'eager'}
      decoding="async"
      className={className}
      srcSet={srcSet}
      sizes={sizes}
      {...rest}
    />
  );
};

OptimizedImage.propTypes = {
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
};

export default OptimizedImage;
