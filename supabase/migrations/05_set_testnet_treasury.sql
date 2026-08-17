
update public.treasury_wallets
set
  address = '0x0dfdb5bbaeece3871f826df1c6fe24a2772f5d38',
  label = 'testnet receive'
where address in (
  '0x0000000000000000000000000000000000000011',
  '0x0000000000000000000000000000000000000012'
);
