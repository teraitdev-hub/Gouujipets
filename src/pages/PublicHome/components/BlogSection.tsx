import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { db } from "../../../lib/firebase";
import { collection, query, limit, getDocs, orderBy, where } from "firebase/firestore";
import { BookOpen, ArrowRight } from "lucide-react";
import { SkeletonLoader } from "./SkeletonLoader";
import { EmptyState } from "./EmptyState";
import { useNavigate } from "react-router-dom";

export const BlogSection = () => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const q = query(collection(db, "blogs"), where("status", "==", "published"), limit(3));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sorting in client if composite index missing
        data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setBlogs(data);
      } catch (error) {
        console.error("Failed to fetch blogs:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBlogs();
  }, []);

  if (isLoading) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <SkeletonLoader type="card" count={3} />
      </section>
    );
  }

  if (blogs.length === 0) {
    return (
      <section className="py-10 px-4 max-w-7xl mx-auto">
        <EmptyState 
          icon={<BookOpen className="text-slate-400" size={32} />}
          title="No Articles Published Yet" 
          description="Our pet care experts are working on bringing you the best advice and guides. Stay tuned!" 
        />
      </section>
    );
  }

  return (
    <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Pet Care Guides & News</h2>
          <p className="text-slate-500 font-semibold mt-2">Expert advice to help your pet live their best life.</p>
        </div>
        <button 
          onClick={() => navigate('/blog')}
          className="flex items-center gap-2 text-purple-600 font-bold hover:text-purple-700 transition-colors"
        >
          View All Articles <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {blogs.map((blog, i) => (
          <motion.div
            key={blog.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            onClick={() => navigate(`/blog/${blog.id}`)}
            className="bg-white rounded-[24px] border border-slate-200/80 overflow-hidden cursor-pointer group hover:shadow-lg hover:border-purple-200 transition-all duration-300"
          >
            <div className="h-48 overflow-hidden relative bg-slate-100">
              {blog.coverImage ? (
                <img 
                  src={blog.coverImage} 
                  alt={blog.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
              )}
            </div>
            <div className="p-6">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 block">
                {blog.category || "General"}
              </span>
              <h3 className="text-lg font-black text-slate-900 mb-2 leading-tight group-hover:text-purple-700 transition-colors">
                {blog.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 font-medium mb-4">
                {blog.excerpt || "Read this article to learn more..."}
              </p>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 border-t border-slate-100 pt-4">
                <span>{blog.author || "Gouuji Editor"}</span>
                <span>{new Date(blog.createdAt || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
