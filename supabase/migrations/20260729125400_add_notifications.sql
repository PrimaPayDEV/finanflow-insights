create type notification_type as enum ('closure', 'payment', 'error');

create table public.notifications (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    title text not null,
    description text,
    type notification_type not null,
    is_read boolean default false not null,
    merchant_id uuid references public.merchants(id) on delete cascade
);

-- Enable RLS
alter table public.notifications enable row level security;

-- Create policies (allowing read/write for all users for now, adjust based on auth setup)
create policy "Enable all access for notifications" on public.notifications for all using (true) with check (true);

-- Create some mock data
insert into public.notifications (title, description, type, is_read) values 
('Fechamento Concluído', 'O fechamento da fatura de Julho foi gerado com sucesso.', 'closure', false),
('Pagamento Recebido', 'Pagamento de R$ 5.000,00 recebido via Asaas.', 'payment', false),
('Erro na Conciliação', 'Divergência encontrada no extrato do merchant 123.', 'error', false);
