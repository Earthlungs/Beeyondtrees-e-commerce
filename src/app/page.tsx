import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/Header"
import { Leaf, TreePine, Sprout } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F1E8' }}>
      <Header />
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-[#E6D3A3] text-[#4A3F2F] hover:bg-[#D4C193] border-0">
            <Leaf className="h-3 w-3 mr-1" /> Sustainable Living
          </Badge>
          <h1 className="text-6xl font-bold mb-6" style={{ color: '#6B7D5C' }}>
            Beeyond Trees
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto" style={{ color: '#A89F91' }}>
            Connecting you with nature's finest. Sustainable products that go beeyond expectations.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-[#6B7D5C] hover:bg-[#5A6B4D] text-[#F5F1E8]">
              <TreePine className="mr-2 h-5 w-5" />
              Shop Our Collection
            </Button>
            <Button size="lg" variant="outline" className="border-[#6B7D5C] text-[#6B7D5C] hover:bg-[#E6D3A3]">
              <Leaf className="mr-2 h-5 w-5" />
              Our Mission
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="border-[#A89F91] hover:border-[#6B7D5C] transition-colors bg-white">
            <CardHeader>
              <Sprout className="h-10 w-10 text-[#6B7D5C] mb-2" />
              <CardTitle style={{ color: '#4A3F2F' }}>Eco-Friendly</CardTitle>
              <CardDescription style={{ color: '#A89F91' }}>Sustainable materials & practices</CardDescription>
            </CardHeader>
            <CardContent>
              <p style={{ color: '#A89F91' }}>
                Every product is carefully sourced to minimize environmental impact while maximizing quality.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[#A89F91] hover:border-[#8C6A4A] transition-colors bg-white">
            <CardHeader>
              <TreePine className="h-10 w-10 text-[#8C6A4A] mb-2" />
              <CardTitle style={{ color: '#4A3F2F' }}>Tree Planting</CardTitle>
              <CardDescription style={{ color: '#A89F91' }}>We give back to nature</CardDescription>
            </CardHeader>
            <CardContent>
              <p style={{ color: '#A89F91' }}>
                For every purchase, we plant a tree. Join us in reforesting our planet one product at a time.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-[#A89F91] hover:border-[#E6D3A3] transition-colors bg-white">
            <CardHeader>
              <Leaf className="h-10 w-10 text-[#E6D3A3] mb-2" />
              <CardTitle style={{ color: '#4A3F2F' }}>Natural Wellness</CardTitle>
              <CardDescription style={{ color: '#A89F91' }}>Products that nurture life</CardDescription>
            </CardHeader>
            <CardContent>
              <p style={{ color: '#A89F91' }}>
                From herbal remedies to natural skincare, discover the power of plant-based wellness.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center rounded-2xl p-12 text-white" style={{ backgroundColor: '#6B7D5C' }}>
          <h2 className="text-3xl font-bold mb-4 text-[#F5F1E8]">Ready to Go Beeyond?</h2>
          <p className="mb-6" style={{ color: '#E6D3A3' }}>
            Join thousands of conscious consumers making a difference.
          </p>
          <Button size="lg" variant="secondary" className="bg-[#E6D3A3] text-[#4A3F2F] hover:bg-[#D4C193]">
            Start Shopping
          </Button>
        </div>
      </main>
    </div>
  )
}
