-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: ecomflow
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `aria_acoes`
--

DROP TABLE IF EXISTS `aria_acoes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aria_acoes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tenant_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parametros` json NOT NULL,
  `resumo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `analise_impacto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel_risco` enum('baixo','medio','alto') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'medio',
  `status` enum('pendente','confirmada','negada','expirada','erro') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendente',
  `resultado` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_tenant_status` (`tenant_id`,`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `aria_acoes`
--

LOCK TABLES `aria_acoes` WRITE;
/*!40000 ALTER TABLE `aria_acoes` DISABLE KEYS */;
/*!40000 ALTER TABLE `aria_acoes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefone` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `tenant_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `customers_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES (1,'Carlos Silva','carlos@email.com','27999990000',1,1,'2026-10-08 11:53:28'),(2,'Maria Souza','maria@email.com','27999991111',1,1,'2026-10-08 11:53:28');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `integrations`
--

DROP TABLE IF EXISTS `integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `marketplace` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `app_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `client_secret` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `access_token` text COLLATE utf8mb4_unicode_ci,
  `refresh_token` text COLLATE utf8mb4_unicode_ci,
  `expires_at` datetime DEFAULT NULL,
  `seller_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `integrations`
--

LOCK TABLES `integrations` WRITE;
/*!40000 ALTER TABLE `integrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `integrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `integrations_catalog`
--

DROP TABLE IF EXISTS `integrations_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `integrations_catalog` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `campos_credencial` json DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `integrations_catalog`
--

LOCK TABLES `integrations_catalog` WRITE;
/*!40000 ALTER TABLE `integrations_catalog` DISABLE KEYS */;
INSERT INTO `integrations_catalog` VALUES ('amazon','Amazon','canais_venda','📦','Marketplace','[\"seller_id\", \"auth_token\"]','2026-10-08 08:53:28'),('asaas','Asaas','pagamentos','🏦','Gateway de pagamento','[\"api_key\"]','2026-10-08 08:53:28'),('bling','Bling','fiscal','🔵','ERP e emissão de NF-e','[\"client_id\", \"client_secret\"]','2026-10-08 08:53:28'),('correios','Correios','logistica','📬','Rastreio e frete','[\"usuario\", \"senha\"]','2026-10-08 08:53:28'),('frenet','Frenet','logistica','📮','Cotação de frete','[\"token\"]','2026-10-08 08:53:28'),('melhorenvio','Melhor Envio','logistica','🚚','Cotação e etiquetas de frete','[\"access_token\"]','2026-10-08 08:53:28'),('mercadolivre','Mercado Livre','canais_venda','🟡','Marketplace','[\"client_id\", \"client_secret\"]','2026-10-08 08:53:28'),('mercadopago','Mercado Pago','pagamentos','💳','Gateway de pagamento','[\"access_token\", \"public_key\"]','2026-10-08 08:53:28'),('nfe','Emissão de NF-e','fiscal','🧾','Nota fiscal eletrônica','[\"certificado_a1\", \"senha_certificado\"]','2026-10-08 08:53:28'),('nuvemshop','Nuvemshop','canais_venda','🛍️','Loja virtual','[\"access_token\", \"store_id\"]','2026-10-08 08:53:28'),('pagseguro','PagSeguro','pagamentos','💰','Gateway de pagamento','[\"token\", \"email\"]','2026-10-08 08:53:28'),('shopee','Shopee','canais_venda','🟠','Marketplace','[\"partner_id\", \"partner_key\"]','2026-10-08 08:53:28'),('shopify','Shopify','canais_venda','🛒','Loja virtual','[\"api_key\", \"api_secret\", \"shop_url\"]','2026-10-08 08:53:28'),('woocommerce','WooCommerce','canais_venda','🧩','Loja virtual (WordPress)','[\"consumer_key\", \"consumer_secret\", \"site_url\"]','2026-10-08 08:53:28');
/*!40000 ALTER TABLE `integrations_catalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marketplace_orders`
--

DROP TABLE IF EXISTS `marketplace_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `marketplace_orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `marketplace` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `marketplace_order_id` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `buyer_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `buyer_email` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `raw_data` json DEFAULT NULL,
  `synced_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `marketplace_order_unique` (`marketplace`,`marketplace_order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marketplace_orders`
--

LOCK TABLES `marketplace_orders` WRITE;
/*!40000 ALTER TABLE `marketplace_orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `marketplace_orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules_catalog`
--

DROP TABLE IF EXISTS `modules_catalog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules_catalog` (
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `icon` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rota` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disponivel` tinyint(1) NOT NULL DEFAULT '0',
  `nativo` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules_catalog`
--

LOCK TABLES `modules_catalog` WRITE;
/*!40000 ALTER TABLE `modules_catalog` DISABLE KEYS */;
INSERT INTO `modules_catalog` VALUES ('atendimento','Atendimento','Suporte e relacionamento com clientes','🎧',NULL,0,0,'2026-10-08 08:53:28'),('automacoes','Automações','Motor de automação visual','⚡','/automacoes',1,1,'2026-10-08 08:53:28'),('clientes','Clientes','Cadastro e relacionamento com clientes','👥','/customers',1,0,'2026-10-08 08:53:28'),('compras','Compras','Gestão de fornecedores e compras','🛒',NULL,0,0,'2026-10-08 08:53:28'),('financeiro','Financeiro','Contas a pagar/receber e fluxo de caixa','💰',NULL,0,1,'2026-10-08 08:53:28'),('fiscal','Fiscal e Contábil','Notas fiscais e obrigações fiscais','🧾',NULL,0,0,'2026-10-08 08:53:28'),('integracoes','Integrações','Bling, Mercado Livre e outras plataformas','🔗','/integracoes',1,1,'2026-10-08 08:53:28'),('logistica','Logística','Envios e rastreamento de entregas','🚚',NULL,0,0,'2026-10-08 08:53:28'),('marketing','Marketing','Campanhas, copy com IA e lead scoring','📣','/marketing',1,0,'2026-10-08 08:53:28'),('pedidos','Pedidos','Processamento e controle de pedidos','📦','/orders',1,0,'2026-10-08 08:53:28'),('produtos','Produtos & Estoque','Catálogo de produtos e controle de estoque','🛒','/products',1,0,'2026-10-08 08:53:28'),('relatorios','Relatórios e BI','Dashboards e análises inteligentes','📈',NULL,0,0,'2026-10-08 08:53:28');
/*!40000 ALTER TABLE `modules_catalog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `product_id` int NOT NULL,
  `quantidade` int NOT NULL,
  `preco_unitario` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `total` decimal(10,2) DEFAULT '0.00',
  `status` enum('pendente','pago','cancelado','enviado','finalizado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendente',
  `observacao` text COLLATE utf8mb4_unicode_ci,
  `tenant_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `preco_mensal` decimal(10,2) NOT NULL,
  `limite_produtos` int DEFAULT '100',
  `limite_pedidos_mes` int DEFAULT '500',
  `limite_usuarios` int DEFAULT '5',
  `marketplaces_permitidos` json DEFAULT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'Básico','Plano inicial',99.90,100,500,5,'[\"mercadolivre\"]',1,'2026-10-08 11:53:28');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci,
  `sku` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preco` decimal(10,2) NOT NULL,
  `estoque` int DEFAULT '0',
  `ativo` tinyint(1) DEFAULT '1',
  `ml_item_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tenant_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Ventilador Industrial 65cm','Modelo alta vazão','VENT65',499.90,10,1,NULL,1,'2026-10-08 11:53:28'),(2,'Exaustor Axial 50cm','Uso industrial','EXA50',379.90,8,1,NULL,1,'2026-10-08 11:53:28');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_integrations`
--

DROP TABLE IF EXISTS `tenant_integrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_integrations` (
  `tenant_id` int NOT NULL,
  `integration_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('connected','disconnected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disconnected',
  `credenciais` json DEFAULT NULL,
  `connected_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`,`integration_id`),
  KEY `integration_id` (`integration_id`),
  CONSTRAINT `tenant_integrations_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_integrations_ibfk_2` FOREIGN KEY (`integration_id`) REFERENCES `integrations_catalog` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_integrations`
--

LOCK TABLES `tenant_integrations` WRITE;
/*!40000 ALTER TABLE `tenant_integrations` DISABLE KEYS */;
/*!40000 ALTER TABLE `tenant_integrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant_modules`
--

DROP TABLE IF EXISTS `tenant_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant_modules` (
  `tenant_id` int NOT NULL,
  `module_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('active','inactive') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  `installed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`tenant_id`,`module_id`),
  KEY `module_id` (`module_id`),
  CONSTRAINT `tenant_modules_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tenant_modules_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `modules_catalog` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant_modules`
--

LOCK TABLES `tenant_modules` WRITE;
/*!40000 ALTER TABLE `tenant_modules` DISABLE KEYS */;
INSERT INTO `tenant_modules` VALUES (1,'automacoes','active','2026-10-08 08:53:28'),(1,'clientes','active','2026-10-08 08:53:28'),(1,'financeiro','active','2026-10-08 08:53:28'),(1,'integracoes','active','2026-10-08 08:53:28'),(1,'marketing','active','2026-10-08 08:53:28'),(1,'pedidos','active','2026-10-08 08:53:28'),(1,'produtos','active','2026-10-08 08:53:28');
/*!40000 ALTER TABLE `tenant_modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenants`
--

DROP TABLE IF EXISTS `tenants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `plan_id` int NOT NULL,
  `ativo` tinyint(1) DEFAULT '1',
  `trial_ends_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `tenants_ibfk_1` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenants`
--

LOCK TABLES `tenants` WRITE;
/*!40000 ALTER TABLE `tenants` DISABLE KEYS */;
INSERT INTO `tenants` VALUES (1,'Empresa Padrão','contato@empresa.com',1,1,NULL,'2026-10-08 11:53:28');
/*!40000 ALTER TABLE `tenants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','user') COLLATE utf8mb4_unicode_ci DEFAULT 'user',
  `ativo` tinyint(1) DEFAULT '1',
  `tenant_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `aria_pin_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `tenant_id` (`tenant_id`),
  CONSTRAINT `users_ibfk_1` FOREIGN KEY (`tenant_id`) REFERENCES `tenants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Rodrigo','rodrigo@email.com','$2b$10$/qqnRuTni6Wq5oTW2p149eWwpE3sYrnSqRdSNam90Lrt8wJt3hmjK','user',1,1,'2026-10-08 11:53:28',NULL),(2,'Admin','admin@apollo.com','$2b$10$/qqnRuTni6Wq5oTW2p149eWwpE3sYrnSqRdSNam90Lrt8wJt3hmjK','admin',1,1,'2026-10-08 11:53:28',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `webhooks_log`
--

DROP TABLE IF EXISTS `webhooks_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `webhooks_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `marketplace` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `topic` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `resource` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `processado` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `webhooks_log`
--

LOCK TABLES `webhooks_log` WRITE;
/*!40000 ALTER TABLE `webhooks_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `webhooks_log` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-08  9:08:29
