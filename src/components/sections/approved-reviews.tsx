"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { PublicReview } from "@/lib/reviews";

type ReviewsResponse = {
  ok?: boolean;
  reviews?: PublicReview[];
};

export function ApprovedReviews() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);

  useEffect(() => {
    let active = true;

    async function loadReviews() {
      try {
        const response = await fetch("/api/review", { cache: "no-store" });
        const result = (await response.json().catch(() => null)) as ReviewsResponse | null;

        if (active && response.ok && result?.ok && Array.isArray(result.reviews)) {
          setReviews(result.reviews);
        }
      } catch {
        if (active) {
          setReviews([]);
        }
      }
    }

    void loadReviews();

    return () => {
      active = false;
    };
  }, []);

  return reviews.map((review) => (
    <Card key={review.id} className="p-6">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-blue-50 font-heading text-lg font-extrabold text-lead-blue">
          {review.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="font-heading font-bold text-lead-navy">{review.name}</h3>
          <p className="text-sm text-lead-gray">{review.course}</p>
        </div>
      </div>
      <div className="mt-5 flex text-lead-yellow" aria-label={`${review.rating} star rating`}>
        {Array.from({ length: 5 }).map((_, star) => (
          <Star key={star} className={`h-4 w-4 ${star < review.rating ? "fill-current" : ""}`} />
        ))}
      </div>
      <p className="mt-4 leading-7 text-lead-gray">{review.feedback}</p>
    </Card>
  ));
}
