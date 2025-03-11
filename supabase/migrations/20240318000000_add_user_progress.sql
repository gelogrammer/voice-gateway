-- Create category enum type
create type recording_category as enum (
    'HIGH_FLUENCY',
    'MEDIUM_FLUENCY',
    'LOW_FLUENCY',
    'CLEAR_PRONUNCIATION',
    'UNCLEAR_PRONUNCIATION',
    'FAST_TEMPO',
    'MEDIUM_TEMPO',
    'SLOW_TEMPO'
);

-- Create user_progress table
create table if not exists public.user_progress (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    completed_scripts text[] default '{}' not null,
    current_category recording_category not null default 'HIGH_FLUENCY',
    last_updated timestamp with time zone default timezone('utc'::text, now()) not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    -- Add a unique constraint on user_id to ensure one record per user
    constraint user_progress_user_id_key unique (user_id)
);

-- Set up RLS (Row Level Security)
alter table public.user_progress enable row level security;

-- Create policies
create policy "Users can view their own progress"
    on public.user_progress for select
    using (auth.uid() = user_id);

create policy "Users can update their own progress"
    on public.user_progress for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can insert their own progress"
    on public.user_progress for insert
    with check (auth.uid() = user_id);

-- Create index for faster lookups
create index user_progress_user_id_idx on public.user_progress(user_id);

-- Grant access to authenticated users
grant all on public.user_progress to authenticated; 