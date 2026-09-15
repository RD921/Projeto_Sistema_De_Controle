INSERT INTO event_types (code, label, category, description, module) VALUES
  ('ORDER_PICKING_STARTED', 'Separacao iniciada', 'logistica', 'Disparado quando a separacao de um envio comeca', 'logistica'),
  ('ORDER_PACKED', 'Pedido embalado', 'logistica', 'Disparado quando a embalagem de um envio e registrada', 'logistica'),
  ('ORDER_SHIPPED', 'Pedido expedido', 'logistica', 'Disparado quando um envio e despachado', 'logistica'),
  ('ORDER_DELIVERED', 'Pedido entregue', 'logistica', 'Disparado quando um envio e marcado como entregue', 'logistica'),
  ('TRACKING_UPDATED', 'Rastreamento atualizado', 'logistica', 'Disparado quando um codigo de rastreio e registrado', 'logistica'),
  ('RETURN_CREATED', 'Devolucao criada', 'logistica', 'Disparado quando uma solicitacao de devolucao e criada', 'logistica'),
  ('RETURN_RECEIVED', 'Devolucao recebida', 'logistica', 'Disparado quando um produto devolvido e recebido de volta', 'logistica');