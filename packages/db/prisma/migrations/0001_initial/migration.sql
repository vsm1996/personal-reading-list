-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "books" (
    "id" TEXT NOT NULL,
    "open_library_id" TEXT,
    "google_books_id" TEXT,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "cover_url" TEXT,
    "page_count" INTEGER,
    "publish_year" INTEGER,
    "isbn_10" TEXT,
    "isbn_13" TEXT,
    "publisher" TEXT,
    "description" TEXT,
    "genres" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelves" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_books" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "book_id" TEXT NOT NULL,
    "shelf_id" TEXT NOT NULL,
    "date_added" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "date_finished" TIMESTAMP(3),

    CONSTRAINT "user_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_progress" (
    "id" TEXT NOT NULL,
    "user_book_id" TEXT NOT NULL,
    "current_page" INTEGER NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_history" (
    "id" TEXT NOT NULL,
    "user_book_id" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progress_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "user_book_id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "user_book_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reading_goals" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "year" INTEGER NOT NULL,
    "target_count" INTEGER NOT NULL,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reading_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" TEXT NOT NULL,
    "profile_id" UUID NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "default_shelf" TEXT,
    "display_mode" TEXT NOT NULL DEFAULT 'grid',

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "books_open_library_id_key" ON "books"("open_library_id");

-- CreateIndex
CREATE UNIQUE INDEX "books_google_books_id_key" ON "books"("google_books_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_books_profile_id_book_id_key" ON "user_books"("profile_id", "book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_progress_user_book_id_key" ON "reading_progress"("user_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_user_book_id_key" ON "ratings"("user_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "notes_user_book_id_key" ON "notes"("user_book_id");

-- CreateIndex
CREATE UNIQUE INDEX "reading_goals_profile_id_year_key" ON "reading_goals"("profile_id", "year");

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_profile_id_key" ON "user_preferences"("profile_id");

-- AddForeignKey
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_books" ADD CONSTRAINT "user_books_shelf_id_fkey" FOREIGN KEY ("shelf_id") REFERENCES "shelves"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_book_id_fkey" FOREIGN KEY ("user_book_id") REFERENCES "user_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_history" ADD CONSTRAINT "progress_history_user_book_id_fkey" FOREIGN KEY ("user_book_id") REFERENCES "user_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_book_id_fkey" FOREIGN KEY ("user_book_id") REFERENCES "user_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_book_id_fkey" FOREIGN KEY ("user_book_id") REFERENCES "user_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reading_goals" ADD CONSTRAINT "reading_goals_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

