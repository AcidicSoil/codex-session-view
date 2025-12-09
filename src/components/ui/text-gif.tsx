import React, { useEffect, useMemo, useState, type CSSProperties } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "~/lib/utils"

// Define text style variants
const textBaseVariants = cva("", {
  variants: {
    size: {
      default: "text-2xl sm:text-3xl lg:text-4xl",
      xxs: "text-base sm:text-lg lg:text-lg",
      xs: "text-lg sm:text-xl lg:text-2xl",
      sm: "text-xl sm:text-2xl lg:text-3xl",
      md: "text-2xl sm:text-3xl lg:text-4xl",
      lg: "text-3xl sm:text-4xl lg:text-5xl",
      xl: "text-4xl sm:text-5xl lg:text-6xl",
      xxl: "text-[2.5rem] sm:text-6xl lg:text-[6rem]",
      xll: "text-5xl sm:text-6xl lg:text-[7rem]",
      xxxl: "text-[6rem] leading-5 lg:leading-8 sm:text-6xl lg:text-[8rem]",
    },
    weight: {
      default: "font-bold",
      thin: "font-thin",
      base: "font-base",
      semi: "font-semibold",
      bold: "font-bold",
      black: "font-black",
    },
    font: {
      default: "font-sansTight",
      serif: "font-serif",
      mono: "font-mono",
    },
  },
  defaultVariants: {
    size: "default",
    weight: "bold",
    font: "default",
  },
})

interface TextGifProps extends VariantProps<typeof textBaseVariants> {
  gif: string
  text: string
  className?: string
  fallbackColor?: string
  transitionDuration?: number
}

const TextGif = React.memo(function TextGifComponent({
  gif,
  text,
  size,
  weight,
  font,
  className,
  fallbackColor = "currentColor",
  transitionDuration = 300,
}: TextGifProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  // Preload the GIF on the client so we know when it's ready
  useEffect(() => {
    if (!gif || typeof Image === "undefined") {
      setLoaded(false)
      return
    }

    setLoaded(false)
    setError(false)

    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => {
      setLoaded(true)
      setError(false)
    }
    image.onerror = () => {
      setError(true)
      setLoaded(false)
    }
    image.src = gif

    return () => {
      image.onload = null
      image.onerror = null
    }
  }, [gif])

  // Memoize className for performance
  const textClassName = useMemo(
    () =>
      cn(
        textBaseVariants({ size, weight, font }),
        loaded && !error ? "text-transparent bg-clip-text" : "",
        className,
        "pb-1.5 md:pb-4"
      ),
    [size, weight, font, className, loaded, error]
  )

  // Memoize style for performance
  const textStyle = useMemo(() => {
    const style: CSSProperties = {
      backgroundImage: `url(${gif})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      lineHeight: 1,
      display: "inline-block",
      textAlign: "center",
      color: fallbackColor, // Always set the fallback color initially
      WebkitTextFillColor: fallbackColor, // Safari fix
      transition: `background-image ${transitionDuration}ms ease-in-out, color ${transitionDuration}ms ease-in-out`,
    }

    if (loaded && !error) {
      style.color = "transparent"
      style.WebkitTextFillColor = "transparent" // Safari fix
    }

    return style
  }, [loaded, error, gif, transitionDuration, fallbackColor])

  return (
    <div className="relative inline-block">
      <span className={textClassName} style={textStyle}>
        {text}
      </span>
    </div>
  )
})

// Export common GIF URLs
const gifUrls = [
  "https://media.giphy.com/media/3zvbrvbRe7wxBofOBI/giphy.gif",
  "https://media.giphy.com/media/fnglNFjBGiyAFtm6ke/giphy.gif",
  "https://media.giphy.com/media/9Pmfazv34l7aNIKK05/giphy.gif",
  "https://media.giphy.com/media/4bhs1boql4XVJgmm4H/giphy.gif",
]

// Optional: Preloader component
function PreloadGifs() {
  return (
    <div className="hidden">
      {gifUrls.map((url) => (
        <img
          key={url}
          src={url}
          alt=""
          width={1}
          height={1}
          loading="lazy"
          decoding="async"
        />
      ))}
    </div>
  )
}

export { TextGif }
export default TextGif
