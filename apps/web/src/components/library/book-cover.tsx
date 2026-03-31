import type { BookPreview } from "@/types/library";
import Image from "next/image";

type Props = {
  book: Pick<BookPreview, "title" | "authors" | "coverUrl">;
  size?: "sm" | "md" | "lg";
  fluid?: boolean;
  className?: string;
};

const sizes = {
  sm: { width: 48,  height: 72,  className: "w-12 h-18" },
  md: { width: 80,  height: 120, className: "w-20 h-[120px]" },
  lg: { width: 128, height: 192, className: "w-32 h-48" },
};

export function BookCover({ book, size = "md", fluid = false, className = "" }: Props) {
  const { width, height, className: sizeClass } = sizes[size];
  const containerClass = fluid
    ? "aspect-[2/3] w-full"
    : sizeClass;
  const imageSizes = fluid
    ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
    : `${width}px`;

  return (
    <div
      className={`book-cover-3d relative shrink-0 overflow-hidden rounded-sm bg-bg-tertiary ${containerClass} ${className}`}
      style={fluid ? undefined : { aspectRatio: `${width}/${height}` }}
    >
      {book.coverUrl ? (
        <Image
          src={book.coverUrl}
          alt={book.title}
          fill
          sizes={imageSizes}
          className="object-cover"
          loading="lazy"
        />
      ) : (
        <BookCoverPlaceholder title={book.title} authors={book.authors} />
      )}
    </div>
  );
}

function BookCoverPlaceholder({
  title,
  authors,
}: {
  title: string;
  authors: string[];
}) {
  return (
    <div className="cover-placeholder-bloom flex h-full w-full flex-col justify-between bg-bg-secondary p-2">
      {/* Decorative top stripe */}
      <div className="h-1 w-full rounded-full bg-accent opacity-40" />
      <div className="flex-1 flex flex-col justify-center gap-1 py-1">
        <p
          className="line-clamp-4 text-center font-heading text-[9px] font-semibold leading-tight text-text-primary"
          style={{ fontSize: "clamp(7px, 1.5vw, 9px)" }}
        >
          {title}
        </p>
        {authors[0] && (
          <p
            className="line-clamp-2 text-center text-[7px] leading-tight text-text-tertiary"
          >
            {authors[0]}
          </p>
        )}
      </div>
      <div className="h-px w-full bg-border" />
    </div>
  );
}
