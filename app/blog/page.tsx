import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Blog | ParkZipply",
  description:
    "Insights, updates, and smart parking innovations from ParkZipply.",
};

const blogPosts = [
  {
    title: "The Future of Smart Parking",
    date: "January 2026",
    excerpt: "How technology is reshaping urban parking systems and reducing congestion in major cities.",
    category: "Innovation"
  },
  {
    title: "5 Ways to Reduce Parking Stress",
    date: "December 2025",
    excerpt: "Discover practical tips to make parking faster and easier in busy urban environments.",
    category: "Tips & Tricks"
  }
];

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 py-12 px-4 md:py-24 bg-background">
        <div className="container max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight text-foreground">Our Blog</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stay updated with insights on smart parking, urban mobility, sustainability, and technology.
            </p>
          </div>

          <div className="grid gap-8">
            {blogPosts.map((post, index) => (
              <article key={index} className="group relative rounded-2xl border border-border p-8 hover:bg-accent/50 transition-colors">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 text-sm text-primary font-medium">
                    <span>{post.category}</span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">{post.date}</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    {post.excerpt}
                  </p>
                  <div className="mt-4">
                    <button className="text-sm font-semibold text-primary hover:underline">
                      Read more →
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-20 p-12 rounded-3xl bg-primary/5 text-center border border-primary/10">
            <h3 className="text-2xl font-bold mb-4">Subscribe to our newsletter</h3>
            <p className="text-muted-foreground mb-8">Get the latest parking tips and company updates delivered to your inbox.</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-full px-6 py-3 bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button className="rounded-full px-8 py-3 bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}