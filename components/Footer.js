import Link from 'next/link'
import { useConfig } from '@/lib/config'

const Footer = ({ fullWidth }) => {
  const BLOG = useConfig()

  const d = new Date()
  const y = d.getFullYear()
  const from = +BLOG.since

  return (
    <div
      className={`mt-16 flex-shrink-0 m-auto w-full text-gray-500 dark:text-gray-400 transition-all ${
        !fullWidth ? 'max-w-6xl px-4' : 'px-4 md:px-24'
      }`}
    >
      <hr className="border-gray-200 dark:border-gray-800" />
      <div className="my-6 text-sm leading-6">
        <div className="flex align-baseline justify-between flex-wrap gap-2">
          <p className="font-mono tracking-tight">
            Schub Space, {from === y || !from ? y : `${from} - ${y}`}
          </p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="hover:text-gray-300 transition-colors"
            >
              privacy policy
            </Link>
            <Link
              href="/imprint"
              className="hover:text-gray-300 transition-colors"
            >
              imprint
            </Link>
            <a
              href="https://www.linkedin.com/company/schub-tech/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-300 transition-colors"
            >
              linkedin
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Footer
