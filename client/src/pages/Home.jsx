import AuthenticityBanner from '../components/home/AuthenticityBanner.jsx'
import CategoryGrid from '../components/home/CategoryGrid.jsx'
import CategoryIcons from '../components/home/CategoryIcons.jsx'
import FeaturedGems from '../components/home/FeaturedGems.jsx'
import Hero from '../components/home/Hero.jsx'
import Newsletter from '../components/home/Newsletter.jsx'
import Testimonials from '../components/home/Testimonials.jsx'
import TrustStrip from '../components/home/TrustStrip.jsx'
import { useApi } from '../hooks/useApi.js'

export default function Home() {
  const { data, loading } = useApi('/home')

  return (
    <>
      <title>Geological Kingdom · Natural loose gemstones from Peshawar</title>
      <meta name="description" content="Natural emeralds, rubies, sapphires and aquamarines, hand-selected in Namak Mandi, Peshawar. Origin and treatment disclosed on every stone. Shipped across Pakistan and worldwide." />
      <Hero />
      <CategoryIcons categories={data?.categories} />
      <CategoryGrid categories={data?.categories} />
      <AuthenticityBanner />
      <FeaturedGems featured={data?.featured} newArrivals={data?.newArrivals} loading={loading && !data} />
      <TrustStrip />
      <Testimonials testimonials={data?.testimonials} />
      <Newsletter />
    </>
  )
}
