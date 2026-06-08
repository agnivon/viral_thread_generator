import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { PenSquare, FileText } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1 className="text-4xl font-extrabold mb-2 tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mb-10 text-lg">
        Manage your thread generation workflow.
      </p>
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-300">
          <CardHeader>
            <PenSquare className="w-10 h-10 text-primary mb-4" />
            <CardTitle className="text-2xl">Create Thread</CardTitle>
            <CardDescription className="text-base">
              Generate a highly-engaging viral thread from any URL or document.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/threads/create" 
              className={buttonVariants({ className: "w-full text-md py-6" })}
            >
              Start Creating
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 hover:shadow-md transition-all duration-300">
          <CardHeader>
            <FileText className="w-10 h-10 text-primary mb-4" />
            <CardTitle className="text-2xl">Drafts</CardTitle>
            <CardDescription className="text-base">
              Review, edit, and publish your generated thread drafts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link 
              href="/threads/drafts" 
              className={buttonVariants({ variant: "outline", className: "w-full text-md py-6" })}
            >
              Browse Drafts
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
