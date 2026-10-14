import CategoryTabs from '../components/home/CategoryTabs.jsx'
import FeaturedGems from '../components/home/FeaturedGems.jsx'
import Hero from '../components/home/Hero.jsx'
import Newsletter from '../components/home/Newsletter.jsx'
import OriginGrid from '../components/home/OriginGrid.jsx'
import Testimonials from '../components/home/Testimonials.jsx'
import TrustStrip from '../components/home/TrustStrip.jsx'
import VerifiedBanner from '../components/home/VerifiedBanner.jsx'
import { useApi } from '../hooks/useApi.js'

export default function Home() {
  const { data, loading } = useApi('/home')
  const photos = data?.homepage ?? {}

  return (
    <>
      <title>Geological Kingdom · Natural loose gemstones from Peshawar</title>
      <meta name="description" content="Natural emeralds, rubies, sapphires and aquamarines, hand-selected in Namak Mandi, Peshawar. Origin and treatment disclosed on every stone. Shipped across Pakistan and worldwide." />
      <Hero image={photos.heroImage} />
      <CategoryTabs categories={data?.categories} />
      <VerifiedBanner image={photos.promoImage} />
      <OriginGrid origins={data?.origins} />
      <TrustStrip />
      <FeaturedGems featured={data?.featured} newArrivals={data?.newArrivals} loading={loading && !data} />
      <Testimonials testimonials={data?.testimonials} image={photos.storyImage} />
      <Newsletter />
    </>
  )
}
