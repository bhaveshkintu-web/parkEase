import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const page = await prisma.cMSPage.findUnique({
    where: {
      slug,
      ...(isAdmin ? {} : { status: "PUBLISHED" }),
    },
  });

  if (!page) {
    return {
      title: "Page Not Found",
    };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription || undefined,
  };
}

export default async function CMSPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === "ADMIN";

  const page = await prisma.cMSPage.findUnique({
    where: {
      slug,
      ...(isAdmin ? {} : { status: "PUBLISHED" }),
    },
  });

  if (!page) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-20">
          <article>
            <header className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">
                {page.title}
              </h1>
              {page.publishedAt && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 w-fit mx-auto px-3 py-1 rounded-full border border-border/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>
                    Published on {new Date(page.publishedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </header>

            <div
              className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-img:rounded-xl [&_img]:inline-block prose-p:leading-relaxed prose-p:text-lg text-foreground/90"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
