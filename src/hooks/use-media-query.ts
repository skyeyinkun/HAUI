import { useState, useEffect } from "react"

export function useMediaQuery(query: string) {
  const [value, setValue] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setValue(false)
      return
    }

    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = window.matchMedia(query)
    if ("addEventListener" in result) {
      result.addEventListener("change", onChange)
    } else {
      (result as any).addListener(onChange)
    }
    setValue(result.matches)

    return () => {
      if ("removeEventListener" in result) {
        result.removeEventListener("change", onChange)
      } else {
        (result as any).removeListener(onChange)
      }
    }
  }, [query])

  return value
}
