--
-- PostgreSQL database dump
--

\restrict oC5mgcZWDIRLjLSzVEOCQOwVtEVMw0AQedNRe2enI4qUQzNhHEXd5R9y2beccdh

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: -
--

SET SESSION AUTHORIZATION DEFAULT;

ALTER TABLE "public"."User" DISABLE TRIGGER ALL;

COPY "public"."User" ("id", "email", "name", "password", "role", "phone", "address", "city", "country", "createdAt", "updatedAt", "tradeApproved", "tradeApprovedAt", "mustChangePassword", "active", "permissions") FROM stdin;
cmolwsveu0000446nhr4274yx	admin@mzrparts.com	Demo Admin	$2a$10$znbSQ50R0ygFonElDHG3/.7ae1Vr7dzoBQXGfvKlqOBnAk7hCJ7rm	ADMIN	\N	\N	\N	\N	2026-04-30 20:01:10.662	2026-04-30 20:01:10.662	f	\N	f	t	{}
cmoq91dun000f25rauw7c0g7i	usman531509@gmail.com	Usman Ahmad	$2a$10$KkwKSzGPcbM9ugpVfOZlHO.0p38V2xOelc8obVfGlecmjWXAeJ42.	USER	123456789	Pattan Road Near Eid Gah Pindi Bhattian	Hafizabad	Pakistan	2026-05-03 20:54:47.903	2026-05-03 21:21:03.731	t	2026-05-03 20:54:47.902	f	f	{}
cmor6mb5z0002an3vat470szb	trader@mzrparts.com	Demo Trader	$2a$10$gJ9WFKa1ifp8uLe8c4ZwyObJZGqydqss6LVZoj4ePeL6NDjvTG40q	USER	\N	\N	\N	\N	2026-05-04 12:34:51.527	2026-05-04 12:34:57.472	t	2026-05-04 12:34:51.525	f	t	{}
cmolwsvf00001446n86sscmn3	user@mzrparts.com	Demo Customer	$2a$10$P7bQ1kUNS/7rWJNi54ryiuDl.2nO1veNo5Fov3c0rzWKNEd3si5x2	USER	+1 555 0100	123 Rider Lane	Karachi	Pakistan	2026-04-30 20:01:10.668	2026-05-04 12:40:39.811	f	\N	f	t	{}
\.


ALTER TABLE "public"."User" ENABLE TRIGGER ALL;

--
-- Data for Name: ActivityLog; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."ActivityLog" DISABLE TRIGGER ALL;

COPY "public"."ActivityLog" ("id", "userId", "userName", "userEmail", "userRole", "action", "moduleKey", "target", "targetId", "meta", "createdAt") FROM stdin;
cmovp62510007twyudx2ekopq	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-updated	stock	Ybr 150 tyre	cmon8sqhy0005vode0slkft3a	{"newStock": 75, "setStock": 75}	2026-05-07 16:25:10.741
cmovpectc000d42f4dgizdke1	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-updated	stock	Honda PCX 125 21-26 130/70-13 Tyre	cmonaix3c000139lyqnfcknp8	{"changes": {"stock": {"to": 155, "from": 154}}}	2026-05-07 16:31:37.824
cmovpeu3s000g42f47mweq5rc	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Ybr 150 tyre	cmon8sqhy0005vode0slkft3a	\N	2026-05-07 16:32:00.233
cmovpn497000x42f4y9ingozi	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Brake pad cbr 150	cmooqwiul000712c4mpo0rqfo	{"changes": {"costPrice": {"to": 250, "from": 200}}}	2026-05-07 16:38:26.635
cmovpt86h001n42f4r5hyqw00	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	expense	Salaries: salaries	cmot3h1q1002a1fwj5sqsnm3k	\N	2026-05-07 16:43:11.658
cmovq27eo002142f4jck3veeb	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	expense	Salaries: salaries	cmot3h1q1002a1fwj5sqsnm3k	\N	2026-05-07 16:50:10.56
cmovq2kq2002342f49trofku8	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	expense	Salaries: salaries	cmot3qsso002c1fwjhhbktbr4	{"changes": {"amount": {"to": 2010, "from": 2000}, "paidOn": {"to": "2026-05-05T19:00:00.000Z", "from": "2026-05-06T00:00:00.000Z"}}}	2026-05-07 16:50:27.818
cmovq374o002642f4nh0rx3l1	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order #cmor7ls4	cmor7ls4k000pko8cq1as29nf	{"changes": {"status": {"to": "SHIPPED", "from": "DELIVERED"}}}	2026-05-07 16:50:56.856
cmovqwpqg002942f4fw4r7exd	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order #cmor7ls4	cmor7ls4k000pko8cq1as29nf	{"changes": {"status": {"to": "DELIVERED", "from": "SHIPPED"}}}	2026-05-07 17:13:53.992
cmovrj7ez002g42f4a81tfnvw	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Brake Caliper Honda CBR 250	cmooqr83w000112c4xhw7td4n	{"changes": {"compatibilities": {"to": "2 fitment(s)", "from": "1 fitment(s)"}}}	2026-05-07 17:31:23.34
cmp2s3bmt000bh1nzgb1zk644	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	bike-model	Honda CBR 150	cmp2s3bmd0009h1nzoiru006w	{"changes": {"yearEnd": {"to": 2024}, "yearStart": {"to": 2022}}}	2026-05-12 15:21:25.157
cmp2sjiel00074u9pxy9g34fv	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	bike-model	Honda CBR 150	cmp2s3bmd0009h1nzoiru006w	\N	2026-05-12 15:34:00.429
cmp2sjtfn000b4u9pfnmvolo9	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	bike-model	Honda CBR 150	cmp2sjtff00094u9pbgubkb92	{"changes": {"yearEnd": {"to": 2026}, "yearStart": {"to": 2022}}}	2026-05-12 15:34:14.724
cmp5xaqac000nn8uizw78slvq	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	courier	test	cmp5xaqa5000ln8uipo6sc6w4	\N	2026-05-14 20:10:27.348
cmp5yqaol0029n8uiqjc78zf2	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000002	cmoq99816001w25ra5cp7hvj8	{"changes": {"status": {"to": "SHIPPED", "from": "DELIVERED"}}, "courierId": "cmp5xaqa5000ln8uipo6sc6w4", "trackingNumber": "35235235235235235"}	2026-05-14 20:50:33.238
cmp77mszp000k11ga58wwkuhs	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000002	cmoq99816001w25ra5cp7hvj8	{"changes": {"status": {"to": "PAID", "from": "SHIPPED"}}}	2026-05-15 17:47:33.062
cmp77ox48000m11ga8bdub6k1	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	courier	Royal mail	cmp5xaqa5000ln8uipo6sc6w4	{"changes": {"name": {"to": "Royal mail", "from": "test"}, "trackingUrl": {"to": "https://www.royalmail.com/track-your-item#/tracking-results", "from": "https://ga-dev-tools.google/campaign-url-builder/"}}}	2026-05-15 17:49:11.72
cmp77q4hp000p11gabi25zduk	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	courier	Royal Maill	cmp77q4hm000n11ga5xzfrkzr	\N	2026-05-15 17:50:07.933
cmp77qmhm000r11ga9zzj1chm	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	courier	Royal mail	cmp5xaqa5000ln8uipo6sc6w4	{"changes": {"active": {"to": false, "from": true}}}	2026-05-15 17:50:31.258
cmp77qvpt000t11gajq3dv1g4	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	courier	Royal mail	cmp5xaqa5000ln8uipo6sc6w4	{"changes": {"active": {"to": true, "from": false}}}	2026-05-15 17:50:43.218
cmp77r55g000w11gavo8dwuvi	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000002	cmoq99816001w25ra5cp7hvj8	{"changes": {"status": {"to": "SHIPPED", "from": "PAID"}}, "courierId": "cmp77q4hm000n11ga5xzfrkzr", "trackingNumber": "35235235235235235"}	2026-05-15 17:50:55.444
cmp77rd2s000y11gaenki43jl	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	courier	Royal mail	cmp5xaqa5000ln8uipo6sc6w4	\N	2026-05-15 17:51:05.716
cmp77s91w001111gaxn54d0rt	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000002	cmoq99816001w25ra5cp7hvj8	{"changes": {"status": {"to": "PAID", "from": "SHIPPED"}}}	2026-05-15 17:51:47.157
cmp77szhw001411gas3rgrjww	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000002	cmoq99816001w25ra5cp7hvj8	{"changes": {"status": {"to": "SHIPPED", "from": "PAID"}}, "courierId": "cmp77q4hm000n11ga5xzfrkzr", "trackingNumber": "WQ470382483GB"}	2026-05-15 17:52:21.429
cmp77wcgc001j11ga7tdlbac6	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	supplier	Recusandae Non et d	cmp77wcg4001h11gauv2xlmta	\N	2026-05-15 17:54:58.189
cmp8q2bi5000c8fjgph0zmlfc	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	purchase-order	PO5000001 for Recusandae Non et d	cmp8q2bhc00088fjg97yn1ub7	{"total": 250, "status": "RECEIVED"}	2026-05-16 19:11:16.157
cmp8r6hxi000811wqe2orbacw	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	purchase-order	PO5000001	cmp8q2bhc00088fjg97yn1ub7	{"changes": {"status": {"to": "CANCELLED", "from": "RECEIVED"}}}	2026-05-16 19:42:30.726
cmp8r6jqb000a11wq1bnbmzeg	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	purchase-order	PO5000001	cmp8q2bhc00088fjg97yn1ub7	\N	2026-05-16 19:42:33.059
cmp8r6uw0000j11wqyd3g8uos	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	purchase-order	PO5000001 for Recusandae Non et d	cmp8r6uvk000d11wqp8a18zo3	{"total": 250, "status": "RECEIVED"}	2026-05-16 19:42:47.521
cmp8rkah30008frv5otak4vav	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	purchase-order	PO5000001	cmp8r6uvk000d11wqp8a18zo3	{"changes": {"status": {"to": "CANCELLED", "from": "RECEIVED"}}}	2026-05-16 19:53:14.248
cmp8rkeuu000afrv5bhxqwgor	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	purchase-order	PO5000001	cmp8r6uvk000d11wqp8a18zo3	\N	2026-05-16 19:53:19.926
cmp8rl9pv000dfrv5gnybjgpy	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-updated	stock	Ybr 150 tyre	cmon8sqhy0005vode0slkft3a	{"changes": {"lowStockThreshold": {"to": 1, "from": 5}}, "layerDelta": 0}	2026-05-16 19:53:59.923
cmp8rnsem000jfrv5l9xhh3no	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-updated	stock	Ybr 150 tyre	cmon8sqhy0005vode0slkft3a	{"changes": {"stock": {"to": 1, "from": 75}, "lowStockThreshold": {"to": 5, "from": 1}}, "layerDelta": -74}	2026-05-16 19:55:57.455
cmp8rpwjg000ofrv5wgo3j43p	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-received	stock-received	+25 units @ 260.00	cmon8sqhy0005vode0slkft3a	{"changes": {"price": {"to": 330, "from": 325}, "stock": {"to": 26, "from": 1}, "costPrice": {"to": 260, "from": 250}}, "layerId": "cmp8rpwj8000mfrv57yx6cp94", "quantity": 25, "unitCost": 260, "retailPrice": 330}	2026-05-16 19:57:36.125
cmp8siq140008lm8kh66xxtut	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-received-updated	stock-received	Ybr 150 tyre	cmp8rpwj8000mfrv57yx6cp94	{"changes": {}, "stockDelta": 0}	2026-05-16 20:20:00.712
cmp8sj09g000blm8krbodxt64	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-received-updated	stock-received	Ybr 150 tyre	cmp8rpwj8000mfrv57yx6cp94	{"changes": {"unitRetail": {"to": 340, "from": 330}}, "stockDelta": 0}	2026-05-16 20:20:13.972
cmp8sjyi2000ilm8kj9ielg6n	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	order	Order MZR4000004 for Demo Customer	cmp8sjyhw000elm8k63e4ht0y	{"status": "PENDING", "onBehalfOf": "cmolwsvf00001446n86sscmn3"}	2026-05-16 20:20:58.346
cmp8svvaz000xlm8ktfiyhs6s	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000004	cmp8sjyhw000elm8k63e4ht0y	{"changes": {"status": {"to": "CANCELLED", "from": "PENDING"}}}	2026-05-16 20:30:14.076
cmp8swryd0014lm8krilq0pwj	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	order	Order MZR4000005 for Demo Customer	cmp8swrxt0010lm8k6q749llv	{"status": "PENDING", "onBehalfOf": "cmolwsvf00001446n86sscmn3"}	2026-05-16 20:30:56.389
cmp8t7fht001flm8ksqphvfn5	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000005	cmp8swrxt0010lm8k6q749llv	{"changes": {"status": {"to": "DELIVERED", "from": "PENDING"}}}	2026-05-16 20:39:13.457
cmp8t8v9v001ilm8kapv71djl	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR4000005	cmp8swrxt0010lm8k6q749llv	{"changes": {"status": {"to": "PENDING", "from": "DELIVERED"}}}	2026-05-16 20:40:20.563
cmp8tmi19002plm8knzkosymb	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	purchase-order	PO5000001 for Recusandae Non et d	cmp8tmi0r002llm8kocjh31tk	{"total": 250, "status": "DRAFT"}	2026-05-16 20:50:56.589
cmp8tmn39002ulm8khxw2vcra	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	purchase-order	PO5000001	cmp8tmi0r002llm8kocjh31tk	{"changes": {"status": {"to": "RECEIVED", "from": "DRAFT"}}}	2026-05-16 20:51:03.142
cmp8tn2ec002xlm8ke7ojx9rb	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	purchase-order	PO5000001	cmp8tmi0r002llm8kocjh31tk	{"changes": {"status": {"to": "DRAFT", "from": "RECEIVED"}}}	2026-05-16 20:51:22.981
cmp8tn3kp0030lm8kdaow4vwq	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	purchase-order	PO5000001	cmp8tmi0r002llm8kocjh31tk	{"changes": {"status": {"to": "CANCELLED", "from": "DRAFT"}}}	2026-05-16 20:51:24.506
cmp8tn5nl0032lm8kguvkc867	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	purchase-order	PO5000001	cmp8tmi0r002llm8kocjh31tk	\N	2026-05-16 20:51:27.201
cmp8tzpeq000cifdifxeajj8g	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	purchase-order	PO5000001 for Recusandae Non et d	cmp8tzpej0008ifdii0nd1pog	{"total": 250, "status": "DRAFT"}	2026-05-16 21:01:12.675
cmp9t6ngm000x4znqlivhmu7t	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	migration-run	migrations	renumber-orders-pos	\N	{"stats": {"posRenumbered": 1, "ordersRenumbered": 5}, "durationMs": 42}	2026-05-17 13:26:23.302
cmp9t6tzs000z4znqr6kd0rtq	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	migration-run	migrations	backfill-order-numbers	\N	{"stats": {"backfilled": 0}, "durationMs": 7}	2026-05-17 13:26:31.768
cmp9t6wqb00114znqs58mfnt8	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	migration-run	migrations	backfill-stock-layers	\N	{"stats": {"balanced": 5, "retailPatched": 0, "poLayersCreated": 0, "writeOffsApplied": 0, "initialLayersAdded": 0, "productsRetailRefreshed": 0}, "durationMs": 41}	2026-05-17 13:26:35.316
cmp9u6ntl0008qqsbvmsy8p9u	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	offers	free devilery offer 200 pounds	cmp9u6ntg0006qqsbdzfqh5l4	\N	2026-05-17 13:54:23.385
cmp9u706c000aqqsb266stk7d	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	free devilery offer 200 pounds	cmp9u6ntg0006qqsbdzfqh5l4	{"changes": {"icon": {"to": "❤️", "from": "party"}}}	2026-05-17 13:54:39.396
cmp9ubb19000cqqsbd7ekf1n0	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	free devilery offer 200 pounds	cmp9u6ntg0006qqsbdzfqh5l4	{"changes": {"icon": {"to": "🎁", "from": "❤️"}}}	2026-05-17 13:58:00.094
cmp9ucji2000fqqsbycvp6k2p	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	offers	free shipping	cmp9ucji0000dqqsbltwbw8tm	\N	2026-05-17 13:58:57.723
cmp9ucobm000hqqsbxizh5jsb	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	free shipping	cmp9ucji0000dqqsbltwbw8tm	{"changes": {"active": {"to": false, "from": true}}}	2026-05-17 13:59:03.97
cmp9ucpfp000jqqsbltx97pc0	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	free shipping	cmp9ucji0000dqqsbltwbw8tm	{"changes": {"active": {"to": true, "from": false}}}	2026-05-17 13:59:05.413
cmp9udcux000lqqsbize4fsy7	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	20% on Brakes	cmp9u6ntg0006qqsbdzfqh5l4	{"changes": {"text": {"to": "20% on Brakes", "from": "free devilery offer 200 pounds"}}}	2026-05-17 13:59:35.769
cmp9ut5e5000uqqsb86837xp8	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	free shipping	cmp9ucji0000dqqsbltwbw8tm	{"changes": {"active": {"to": false, "from": true}}}	2026-05-17 14:11:52.59
cmp9ut707000wqqsb1imuoknx	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	20% on Brakes	cmp9u6ntg0006qqsbdzfqh5l4	{"changes": {"active": {"to": false, "from": true}}}	2026-05-17 14:11:54.68
cmp9ut8mc000yqqsbi2yfg098	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	20% on Brakes	cmp9u6ntg0006qqsbdzfqh5l4	{"changes": {"active": {"to": true, "from": false}}}	2026-05-17 14:11:56.773
cmp9ut9u50010qqsbktj663ra	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	offers	free shipping	cmp9ucji0000dqqsbltwbw8tm	{"changes": {"active": {"to": true, "from": false}}}	2026-05-17 14:11:58.349
cmpat1spp000ew8ep1s5jcuvp	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-updated	stock	Ybr 150 tyre	cmon8sqhy0005vode0slkft3a	{"changes": {"stock": {"to": 1, "from": 25}}, "layerDelta": -24}	2026-05-18 06:10:23.005
cmpat2id0000jw8epeqn5fib1	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	stock-received	stock-received	+20 units @ 270.00	cmon8sqhy0005vode0slkft3a	{"changes": {"stock": {"to": 21, "from": 1}, "costPrice": {"to": 270, "from": 260}}, "layerId": "cmpat2ico000hw8epvrdmn9xi", "quantity": 20, "unitCost": 270, "retailPrice": 350}	2026-05-18 06:10:56.245
cmpat384z000sw8epdnouwogr	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	order	Order MZR1005 for Demo Customer	cmpat383d000mw8epc6o4vixb	{"status": "PENDING", "onBehalfOf": "cmolwsvf00001446n86sscmn3"}	2026-05-18 06:11:29.652
cmpat3bz4000vw8ep363ifuw4	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	status-changed	order	Order MZR1005	cmpat383d000mw8epc6o4vixb	{"changes": {"status": {"to": "PAID", "from": "PENDING"}}}	2026-05-18 06:11:34.624
cmpelqv5s000anbenl6jl6zvy	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	Brake pads	cmpelqv5j0008nben3hqs0674	\N	2026-05-20 21:57:00.352
cmpelrajj000fnbenxwjuaprw	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	brake shoess	cmpelrajb000dnbenp5ynsucy	\N	2026-05-20 21:57:20.288
cmpelrw9c000knbenl9haoscj	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	organic brakes	cmpelrw95000inbenrw862cgx	\N	2026-05-20 21:57:48.432
cmpels4cy000pnbenlgc8sy72	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	TT carbon brakes	cmpels4ct000nnbenspe90f5o	\N	2026-05-20 21:57:58.931
cmpelsl2k000unbenizj6lr86	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	HH sintered barke pads	cmpelsl2d000snbenkw6fnvll	\N	2026-05-20 21:58:20.588
cmpeltz98000znbenucpk39xl	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Brake pad cbr 150	cmooqwiul000712c4mpo0rqfo	{"changes": {"category": {"to": "organic brakes", "from": "Brakes"}}}	2026-05-20 21:59:25.629
cmpfxyp1f000gfnl44dfk0d9x	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	brakes paddds	cmpfxyp12000efnl48vovhk4m	\N	2026-05-21 20:26:47.236
cmpfy067l000lfnl4n7wfpvzy	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	orrrr	cmpfy067e000jfnl4fmr8ll03	\N	2026-05-21 20:27:56.145
cmpfy0bh2000nfnl4j429i1jw	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	category	orrrr	cmpfy067e000jfnl4fmr8ll03	\N	2026-05-21 20:28:02.966
cmpfzhgbt000ewvdi9zc6aug9	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	order	Order MZR1008 for Demo Customer	cmpfzhgb00008wvdig32qnure	{"status": "PENDING", "onBehalfOf": "cmolwsvf00001446n86sscmn3"}	2026-05-21 21:09:22.026
cmph2dbsd000k548xwdpxviyz	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	order	Order MZR1017 for Demo Customer	cmph2dbrk000e548xnw76a8m6	{"status": "PENDING", "onBehalfOf": "cmolwsvf00001446n86sscmn3"}	2026-05-22 15:17:54.541
cmpn4hmgr000s9kkhibntjr4t	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	test	cmpn4hmgd000q9kkh6ey2f3er	\N	2026-05-26 21:03:51.291
cmpn4hphk000u9kkhi85uwxv7	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	category	test	cmpn4hmgd000q9kkh6ey2f3er	\N	2026-05-26 21:03:55.208
cmpn4hvgm000x9kkhzrbf05wm	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	brand	test	cmpn4hvgf000v9kkhaw320r8b	\N	2026-05-26 21:04:02.95
cmpn4hym5000z9kkhd6av3apj	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	brand	test	cmpn4hvgf000v9kkhaw320r8b	\N	2026-05-26 21:04:07.037
cmpn4ma1h00199kkhwpm3hjpj	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	product	Brendan Cabrera	cmpn4ma0o00179kkhfqasgv87	\N	2026-05-26 21:07:28.47
cmpn4mjmc001b9kkhkikktmz7	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	product	Brendan Cabrera	cmpn4ma0o00179kkhfqasgv87	\N	2026-05-26 21:07:40.885
cmpn4mw45001g9kkhoharftov	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	test	cmpn4mw3y001e9kkhsv4v4kgc	\N	2026-05-26 21:07:57.077
cmpn4mz7b001i9kkhu5a5n8x4	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	category	test	cmpn4mw3y001e9kkhsv4v4kgc	\N	2026-05-26 21:08:01.079
cmpn4yzg0001r9kkht66rs4vg	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Honda PCX 125 21-26 130/70-13 Tyre	cmonaix3c000139lyqnfcknp8	{"changes": {"active": {"to": false, "from": true}}}	2026-05-26 21:17:21.265
cmpn4z0us001u9kkh3fldf3nv	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Honda PCX 125 21-26 130/70-13 Tyre	cmonaix3c000139lyqnfcknp8	{"changes": {"active": {"to": true, "from": false}}}	2026-05-26 21:17:23.093
cmpn51hhy001x9kkhztzmxs35	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	brand	test	cmpn51hhr001v9kkhar9rna1y	\N	2026-05-26 21:19:17.974
cmpn51lyb001z9kkhakm09rif	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	brand	test	cmpn51hhr001v9kkhar9rna1y	\N	2026-05-26 21:19:23.748
cmpn527a900229kkhvr1dac64	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Brake pad cbr 150	cmooqwiul000712c4mpo0rqfo	{"changes": {"active": {"to": false, "from": true}}}	2026-05-26 21:19:51.393
cmpn52j2r00259kkhdvexcrnn	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Brake pad cbr 150	cmooqwiul000712c4mpo0rqfo	{"changes": {"active": {"to": true, "from": false}}}	2026-05-26 21:20:06.675
cmpn5rpom003a9kkhww7lu1o7	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	created	category	fffff	cmpn5rpog00389kkhl9cwu0di	\N	2026-05-26 21:39:41.639
cmpn5rx8i003c9kkhf9y89v54	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	deleted	category	fffff	cmpn5rpog00389kkhl9cwu0di	\N	2026-05-26 21:39:51.426
cmpoc73zw000gylfck6hnadag	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	updated	product	Brake pad cbr 150	cmooqwiul000712c4mpo0rqfo	{"changes": {"category": {"to": "brakes paddds", "from": "organic brakes"}, "demanding": {"to": true, "from": false}}}	2026-05-27 17:27:23.901
cmpog29in000a124ak0g8mr2x	cmolwsveu0000446nhr4274yx	Demo Admin	admin@mzrparts.com	ADMIN	rejected	trade-request	Incididunt et tempor (pebutukofi@mailinator.com)	cmpofv2xg0007124a5kor7wvs	\N	2026-05-27 19:15:36.239
\.


ALTER TABLE "public"."ActivityLog" ENABLE TRIGGER ALL;

--
-- Data for Name: Address; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Address" DISABLE TRIGGER ALL;

COPY "public"."Address" ("id", "userId", "label", "recipientName", "phone", "line1", "line2", "city", "county", "postcode", "country", "isDefault", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE "public"."Address" ENABLE TRIGGER ALL;

--
-- Data for Name: Brand; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Brand" DISABLE TRIGGER ALL;

COPY "public"."Brand" ("id", "name", "slug", "logoUrl", "createdAt") FROM stdin;
cmon7x93x00007ogkxbjfizjv	Honda	honda	\N	2026-05-01 18:00:16.988
cmon8px810000vodezohajnmb	Yamaha	yamaha	\N	2026-05-01 18:22:34.609
\.


ALTER TABLE "public"."Brand" ENABLE TRIGGER ALL;

--
-- Data for Name: BikeModel; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."BikeModel" DISABLE TRIGGER ALL;

COPY "public"."BikeModel" ("id", "name", "slug", "brandId", "yearStart", "yearEnd", "imageUrl", "createdAt") FROM stdin;
cmon7xhuc00027ogkgmb7p094	CBR 250	honda-cbr-250	cmon7x93x00007ogkxbjfizjv	2020	2026	\N	2026-05-01 18:00:28.308
cmon8qcxp0002vodel1pk2v2m	YBR 150	yamaha-ybr-150	cmon8px810000vodezohajnmb	2020	2022	\N	2026-05-01 18:22:54.974
cmooqughj000512c44xgztiu6	CBR 150	honda-cbr-150	cmon7x93x00007ogkxbjfizjv	2020	2023	\N	2026-05-02 19:37:45.463
cmp2sjtff00094u9pbgubkb92	CBR 150	honda-cbr-150-2022-2026	cmon7x93x00007ogkxbjfizjv	2022	2026	\N	2026-05-12 15:34:14.715
\.


ALTER TABLE "public"."BikeModel" ENABLE TRIGGER ALL;

--
-- Data for Name: Cart; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Cart" DISABLE TRIGGER ALL;

COPY "public"."Cart" ("id", "userId", "createdAt", "updatedAt") FROM stdin;
cmoq7teq00002ksfl475dbbdt	cmolwsveu0000446nhr4274yx	2026-05-03 20:20:36.168	2026-05-03 20:20:36.168
cmoq7x9q4000kksfli7exkmf7	cmolwsvf00001446n86sscmn3	2026-05-03 20:23:36.317	2026-05-03 20:23:36.317
cmoq91zj1000i25ra9c9a0wee	cmoq91dun000f25rauw7c0g7i	2026-05-03 20:55:15.997	2026-05-03 20:55:15.997
cmor6n7af000h1qm1k9v25juk	cmor6mb5z0002an3vat470szb	2026-05-04 12:35:33.159	2026-05-04 12:35:33.159
\.


ALTER TABLE "public"."Cart" ENABLE TRIGGER ALL;

--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Category" DISABLE TRIGGER ALL;

COPY "public"."Category" ("id", "name", "slug", "description", "imageUrl", "createdAt", "parentId", "path", "depth", "sortOrder") FROM stdin;
cmon7xt4l00037ogkl5s89o2z	Exhaust	exhaust		\N	2026-05-01 18:00:42.934	\N	exhaust	0	0
cmon8qv550003vodeulnr02g8	Tyres	tyres		\N	2026-05-01 18:23:18.569	\N	tyres	0	0
cmoohu3750000etefl8q81na6	Brakes	brakes		\N	2026-05-02 15:25:31.697	\N	brakes	0	0
cmpelqv5j0008nben3hqs0674	Brake pads	brake-pads	\N	\N	2026-05-20 21:57:00.343	cmoohu3750000etefl8q81na6	brakes/brake-pads	1	0
cmpelrajb000dnbenp5ynsucy	brake shoess	brake-shoess	\N	\N	2026-05-20 21:57:20.28	cmoohu3750000etefl8q81na6	brakes/brake-shoess	1	0
cmpelrw95000inbenrw862cgx	organic brakes	organic-brakes	\N	\N	2026-05-20 21:57:48.425	cmpelrajb000dnbenp5ynsucy	brakes/brake-shoess/organic-brakes	2	0
cmpels4ct000nnbenspe90f5o	TT carbon brakes	tt-carbon-brakes	\N	\N	2026-05-20 21:57:58.925	cmpelrajb000dnbenp5ynsucy	brakes/brake-shoess/tt-carbon-brakes	2	0
cmpelsl2d000snbenkw6fnvll	HH sintered barke pads	hh-sintered-barke-pads	\N	\N	2026-05-20 21:58:20.582	cmpelrajb000dnbenp5ynsucy	brakes/brake-shoess/hh-sintered-barke-pads	2	0
cmpfxyp12000efnl48vovhk4m	brakes paddds	brakes-paddds	\N	\N	2026-05-21 20:26:47.222	cmpelqv5j0008nben3hqs0674	brakes/brake-pads/brakes-paddds	2	0
\.


ALTER TABLE "public"."Category" ENABLE TRIGGER ALL;

--
-- Data for Name: Product; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Product" DISABLE TRIGGER ALL;

COPY "public"."Product" ("id", "name", "slug", "description", "price", "stock", "images", "sku", "featured", "active", "brandId", "categoryId", "createdAt", "updatedAt", "oemNumber", "lowStockThreshold", "costPrice", "demanding") FROM stdin;
cmonaix3c000139lyqnfcknp8	Honda PCX 125 21-26 130/70-13 Tyre	tyre-honda-cbr-250-kio1	rear tyre\nPCX 125 21-26 130/70-13	150.00	155	{/uploads/1777662781820-b5e993390e50.jpeg}	TYR-325235-433	f	t	cmon7x93x00007ogkxbjfizjv	cmon8qv550003vodeulnr02g8	2026-05-01 19:13:07.077	2026-05-26 21:17:23.082	073523-38334-4	5	120.00	f
cmooqwiul000712c4mpo0rqfo	Brake pad cbr 150	brake-pad-cbr-150-lauy	brake pad	240.00	599	{/uploads/1777750752165-d30e1c4fef34.jpeg}	BRK-35235-2352	f	t	cmon7x93x00007ogkxbjfizjv	cmpfxyp12000efnl48vovhk4m	2026-05-02 19:39:21.837	2026-05-27 17:27:23.883	2242142-235-2352	5	250.00	t
cmon8sqhy0005vode0slkft3a	Ybr 150 tyre	ybr-150-tyre-v49n	tyre	350.00	20	{/uploads/1777659836856-74dffba301c1.webp}	TYR-325235-235	f	t	cmon8px810000vodezohajnmb	cmon8qv550003vodeulnr02g8	2026-05-01 18:24:45.862	2026-05-18 06:11:29.645	02352-23580-83	5	270.00	f
cmon82hk500057ogkypwrnxil	Exhaust	exhaust-6v14	exhaust	200.00	1190	{/uploads/1777658537080-a4e493f20311.webp}	EXH-122822	t	t	cmon7x93x00007ogkxbjfizjv	cmon7xt4l00037ogkl5s89o2z	2026-05-01 18:04:21.22	2026-05-22 15:15:48.091	073523-3830-35	5	150.00	f
cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	brake-caliper-honda-cbr-250-z5pu	brake caliper	300.00	266	{/uploads/1777750485002-801278d60028.webp}	BRK-34534345-945	f	t	cmon7x93x00007ogkxbjfizjv	cmoohu3750000etefl8q81na6	2026-05-02 19:35:14.632	2026-05-22 15:17:54.534	325235-235-235	5	250.00	f
\.


ALTER TABLE "public"."Product" ENABLE TRIGGER ALL;

--
-- Data for Name: CartItem; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."CartItem" DISABLE TRIGGER ALL;

COPY "public"."CartItem" ("id", "cartId", "productId", "quantity", "createdAt", "updatedAt") FROM stdin;
\.


ALTER TABLE "public"."CartItem" ENABLE TRIGGER ALL;

--
-- Data for Name: Courier; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Courier" DISABLE TRIGGER ALL;

COPY "public"."Courier" ("id", "name", "slug", "trackingUrl", "logoUrl", "active", "createdAt", "updatedAt") FROM stdin;
cmp77q4hm000n11ga5xzfrkzr	Royal Maill	royal-maill	https://www.royalmail.com/track-your-item#/tracking-results/	\N	t	2026-05-15 17:50:07.93	2026-05-15 17:50:07.93
\.


ALTER TABLE "public"."Courier" ENABLE TRIGGER ALL;

--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Expense" DISABLE TRIGGER ALL;

COPY "public"."Expense" ("id", "title", "category", "amount", "paidOn", "vendor", "paymentMethod", "notes", "createdByAdminId", "createdAt", "updatedAt") FROM stdin;
cmot3fmd800221fwjgifz20ik	salaries	Salaries	2000.00	2026-05-06 00:00:00	\N	cash	\N	cmolwsveu0000446nhr4274yx	2026-05-05 20:41:12.956	2026-05-05 20:41:36.156
cmot4c8f8002w1fwjro0dc9dg	salaries	Salaries	2000.00	2026-05-05 19:00:00	\N	cash	\N	cmolwsveu0000446nhr4274yx	2026-05-05 21:06:34.532	2026-05-05 21:06:45.607
cmot3qsso002c1fwjhhbktbr4	salaries	Salaries	2010.00	2026-05-05 19:00:00	\N	cash	\N	cmolwsveu0000446nhr4274yx	2026-05-05 20:49:54.482	2026-05-07 16:50:27.812
\.


ALTER TABLE "public"."Expense" ENABLE TRIGGER ALL;

--
-- Data for Name: Offer; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Offer" DISABLE TRIGGER ALL;

COPY "public"."Offer" ("id", "text", "icon", "active", "position", "createdAt", "updatedAt") FROM stdin;
cmp9u6ntg0006qqsbdzfqh5l4	20% on Brakes	🎁	t	0	2026-05-17 13:54:23.381	2026-05-17 14:11:56.771
cmp9ucji0000dqqsbltwbw8tm	free shipping	🚚	t	1	2026-05-17 13:58:57.721	2026-05-17 14:11:58.347
\.


ALTER TABLE "public"."Offer" ENABLE TRIGGER ALL;

--
-- Data for Name: Order; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Order" DISABLE TRIGGER ALL;

COPY "public"."Order" ("id", "userId", "status", "total", "customerName", "customerEmail", "customerPhone", "shippingAddress", "shippingCity", "shippingCountry", "notes", "createdAt", "updatedAt", "createdByAdminId", "stockDeducted", "orderNumber", "courierId", "shippedAt", "trackingNumber", "discount", "shippingFee", "paidAt", "shippingAddressLine2", "shippingCounty", "shippingPostcode", "paymentToken") FROM stdin;
cmpgr9y2f001umfp7t2aws03a	cmolwsvf00001446n86sscmn3	PENDING	360.00	Demo Customer	user@mzrparts.com	35235235252	dgsg	sdg	United Kingdom		2026-05-22 10:07:21.015	2026-05-22 10:07:21.031	\N	t	MZR1014	\N	\N	\N	0.00	0.00	\N	dsg	\N	SWA1AA	17ZX9E1h-xzlIjJ93plHHHIQ
cmpat383d000mw8epc6o4vixb	cmolwsvf00001446n86sscmn3	PAID	357.00	Demo Customer	user@mzrparts.com	+1 555 0100	123 Rider Lane	Karachi	Pakistan		2026-05-18 06:11:29.593	2026-05-18 06:11:34.617	cmolwsveu0000446nhr4274yx	t	MZR1005	\N	\N	\N	0.00	0.00	\N	\N	\N		\N
cmpaunlba002pw8epft4im84b	cmor6mb5z0002an3vat470szb	PENDING	510.30	Demo Trader	trader@mzrparts.com	07556161039	Pattan Road Near Eid Gah Pindi Bhattian\npindi bhattian, district hafizabad, punjab, Pakistan	Hafizabad	United Kingdom	rr	2026-05-18 06:55:19.462	2026-05-18 06:55:19.501	\N	t	MZR1006	\N	\N	\N	0.00	0.00	\N	\N	\N		\N
cmpeiuc2k000cjhrqbrr1zjoo	cmolwsveu0000446nhr4274yx	PENDING	251.99	Demo Admin	admin@mzrparts.com	123456789	faisalabad	faisalabad	United Kingdom		2026-05-20 20:35:43.388	2026-05-20 20:35:43.424	\N	t	MZR1007	\N	\N	\N	0.00	9.99	\N	\N	\N		\N
cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	PAID	372.00	Demo Customer	user@mzrparts.com	+1 555 0100	123 Rider Lane	Karachi	Pakistan		2026-05-21 21:09:21.997	2026-05-21 21:35:14.743	cmolwsveu0000446nhr4274yx	t	MZR1008	\N	\N	\N	0.00	10.00	2026-05-21 21:35:14.742	\N	\N	SWA1A 1AAA	tb7vmwI-xxnT_RyOzjuo4DzD
cmpg0hfic005cwvdixdtcijpy	cmor6mb5z0002an3vat470szb	PENDING	227.99	Demo Trader	trader@mzrparts.com	0342342234	gagasgag	asgasg	United Kingdom		2026-05-21 21:37:20.58	2026-05-21 21:37:20.601	\N	t	MZR1009	\N	\N	\N	0.00	9.99	\N	asgagasg	gasasg	SWA1A 1AA	\N
cmpg0in4i005lwvdimv41w5gg	cmor6mb5z0002an3vat470szb	PENDING	227.99	Demo Trader	trader@mzrparts.com	0342342234	gagasgag	asgasg	United Kingdom		2026-05-21 21:38:17.106	2026-05-21 21:38:17.12	\N	t	MZR1010	\N	\N	\N	0.00	9.99	\N	asgagasg	gasasg	SWA1A 1AA	\N
cmph1j3dz000c12ygi69vj7lq	cmolwsvf00001446n86sscmn3	PENDING	251.99	Demo Customer	user@mzrparts.com	3523542	fwetr	twetwe	United Kingdom		2026-05-22 14:54:23.975	2026-05-22 14:54:24.022	\N	t	MZR1015	\N	\N	\N	0.00	9.99	\N	werwer	\N	SWA	ERqTWBXqJKYqN0zp2XIil0b6
cmpg0mwst0068wvdibxhum9c3	cmor6mb5z0002an3vat470szb	PAID	227.99	Demo Trader	trader@mzrparts.com	326523523	dsgs	ag	United Kingdom		2026-05-21 21:41:36.269	2026-05-21 21:41:52.155	\N	t	MZR1011	\N	\N	\N	0.00	9.99	2026-05-21 21:41:52.154	ag	ag	SWA1AA	\N
cmp8swrxt0010lm8k6q749llv	cmolwsvf00001446n86sscmn3	PENDING	346.50	Demo Customer	user@mzrparts.com	+1 555 0100	123 Rider Lane	Karachi	Pakistan		2026-05-16 20:30:56.369	2026-05-21 21:50:09.307	cmolwsveu0000446nhr4274yx	t	MZR1004	\N	\N	\N	0.00	0.00	\N	\N	\N		qtF_K6CILycPxsESlp6Cna8E
cmpg0se07007vwvdijkeoqzx5	cmolwsvf00001446n86sscmn3	PAID	251.99	Demo Customer	user@mzrparts.com	346346346	sdg	sdg	United Kingdom		2026-05-21 21:45:51.848	2026-05-21 21:51:44.341	\N	t	MZR1012	\N	\N	\N	0.00	9.99	2026-05-21 21:51:44.34	dgs	sgs	4SDG	U4IDAuwALHR5_7gY2yNgZbKn
cmpgqw91v0010mfp77nw8oafq	cmolwsvf00001446n86sscmn3	PENDING	251.99	Demo Customer	user@mzrparts.com	23523523235	erw	ewrw	United Kingdom		2026-05-22 09:56:42.068	2026-05-22 09:56:42.093	\N	t	MZR1013	\N	\N	\N	0.00	9.99	\N	\N	\N	SWA1AA	Nkj7qrBpqumlj9ch8K-U9xij
cmph2am7e000s12yg3rajn9f6	cmolwsvf00001446n86sscmn3	PAID	251.99	Demo Customer	user@mzrparts.com	235223523522	etwewtwet	sgs	United Kingdom		2026-05-22 15:15:48.074	2026-05-22 15:16:08.376	\N	t	MZR1016	\N	\N	\N	0.00	9.99	2026-05-22 15:16:08.373	dg	\N	SDGS	kZb2n5jaUt3YDt-RUTNPqn2X
cmph2dbrk000e548xnw76a8m6	cmolwsvf00001446n86sscmn3	PENDING	360.00	Demo Customer	user@mzrparts.com	+1 555 0100	123 Rider Lane	Karachi	Pakistan		2026-05-22 15:17:54.513	2026-05-22 15:17:54.536	cmolwsveu0000446nhr4274yx	t	MZR1017	\N	\N	\N	0.00	0.00	\N	\N	\N	SFASF	E90PKykeCIk8HFA8lAc0Gg64
cmoo6bn2o000215ozx46ybsa1	cmolwsveu0000446nhr4274yx	DELIVERED	219.99	Usman Ahmad	admin@mzrparts.com	123456789	faisalabad	faisalabad	United Kingdom		2026-05-02 10:03:15.215	2026-05-17 13:26:23.275	\N	t	MZR1000	\N	\N	\N	0.00	0.00	\N	\N	\N		\N
cmoq99816001w25ra5cp7hvj8	cmolwsvf00001446n86sscmn3	SHIPPED	315.00	Demo Customer	user@mzrparts.com	123456789	faisalabad	faisalabad	United Kingdom		2026-05-03 21:00:53.61	2026-05-17 13:26:23.279	\N	f	MZR1001	cmp77q4hm000n11ga5xzfrkzr	2026-05-15 17:52:21.421	WQ470382483GB	0.00	0.00	\N	\N	\N		\N
cmor7ls4k000pko8cq1as29nf	cmor6mb5z0002an3vat470szb	DELIVERED	198.99	Demo Trader	trader@mzrparts.com	+1 555 0100	123 Rider Lane	Karachi	Pakistan		2026-05-04 13:02:26.468	2026-05-17 13:26:23.282	cmolwsveu0000446nhr4274yx	t	MZR1002	\N	\N	\N	0.00	0.00	\N	\N	\N		\N
cmp8sjyhw000elm8k63e4ht0y	cmolwsvf00001446n86sscmn3	CANCELLED	346.50	Demo Customer	user@mzrparts.com	+1 555 0100	123 Rider Lane	Karachi	Pakistan		2026-05-16 20:20:58.34	2026-05-17 13:26:23.284	cmolwsveu0000446nhr4274yx	f	MZR1003	\N	\N	\N	0.00	0.00	\N	\N	\N		\N
\.


ALTER TABLE "public"."Order" ENABLE TRIGGER ALL;

--
-- Data for Name: OrderItem; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."OrderItem" DISABLE TRIGGER ALL;

COPY "public"."OrderItem" ("id", "orderId", "productId", "name", "price", "quantity", "originalPrice") FROM stdin;
cmoo6bn2p000415ozswaxodvu	cmoo6bn2o000215ozx46ybsa1	cmon82hk500057ogkypwrnxil	Exhaust	200.00	1	200.00
cmoq99816001y25razdpcbuv3	cmoq99816001w25ra5cp7hvj8	cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	300.00	1	300.00
cmor7ls4k000rko8c859oc6t2	cmor7ls4k000pko8cq1as29nf	cmon82hk500057ogkypwrnxil	Exhaust	180.00	1	200.00
cmp8sjyhw000glm8kpadb6v82	cmp8sjyhw000elm8k63e4ht0y	cmon8sqhy0005vode0slkft3a	Ybr 150 tyre	330.00	1	330.00
cmp8swrxt0012lm8k4sk40frf	cmp8swrxt0010lm8k6q749llv	cmon8sqhy0005vode0slkft3a	Ybr 150 tyre	330.00	1	330.00
cmpat383d000ow8epln4nycjr	cmpat383d000mw8epc6o4vixb	cmon8sqhy0005vode0slkft3a	Ybr 150 tyre	340.00	1	340.00
cmpaunlba002rw8epe3r0d4sd	cmpaunlba002pw8epft4im84b	cmooqwiul000712c4mpo0rqfo	Brake pad cbr 150	216.00	1	240.00
cmpaunlba002sw8epg0i8s2s6	cmpaunlba002pw8epft4im84b	cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	270.00	1	300.00
cmpeiuc2k000ejhrqe6dmr6u6	cmpeiuc2k000cjhrqbrr1zjoo	cmon82hk500057ogkypwrnxil	Exhaust	200.00	1	200.00
cmpfzhgb0000awvdi076ophvr	cmpfzhgb00008wvdig32qnure	cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	300.00	1	300.00
cmpg0hfic005ewvdim0ql4isa	cmpg0hfic005cwvdixdtcijpy	cmon82hk500057ogkypwrnxil	Exhaust	180.00	1	200.00
cmpg0in4i005nwvdi7n7jywgq	cmpg0in4i005lwvdimv41w5gg	cmon82hk500057ogkypwrnxil	Exhaust	180.00	1	200.00
cmpg0mwst006awvdi2qqz1ziy	cmpg0mwst0068wvdibxhum9c3	cmon82hk500057ogkypwrnxil	Exhaust	180.00	1	200.00
cmpg0se07007xwvdiplaa8i4q	cmpg0se07007vwvdijkeoqzx5	cmon82hk500057ogkypwrnxil	Exhaust	200.00	1	200.00
cmpgqw91w0012mfp7b7vwwkfs	cmpgqw91v0010mfp77nw8oafq	cmon82hk500057ogkypwrnxil	Exhaust	200.00	1	200.00
cmpgr9y2f001wmfp7ipc2p02x	cmpgr9y2f001umfp7t2aws03a	cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	300.00	1	300.00
cmph1j3dz000e12ygeb02v2vm	cmph1j3dz000c12ygi69vj7lq	cmon82hk500057ogkypwrnxil	Exhaust	200.00	1	200.00
cmph2am7e000u12ygnybcbg21	cmph2am7e000s12yg3rajn9f6	cmon82hk500057ogkypwrnxil	Exhaust	200.00	1	200.00
cmph2dbrl000g548x887mmh3d	cmph2dbrk000e548xnw76a8m6	cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	300.00	1	300.00
\.


ALTER TABLE "public"."OrderItem" ENABLE TRIGGER ALL;

--
-- Data for Name: Supplier; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Supplier" DISABLE TRIGGER ALL;

COPY "public"."Supplier" ("id", "name", "contactName", "email", "phone", "address", "city", "country", "notes", "active", "createdAt", "updatedAt") FROM stdin;
cmp77wcg4001h11gauv2xlmta	Recusandae Non et d	Aliquam voluptas cup	fabymicuh@mailinator.com	Inventore autem est	Est explicabo Labo	Ullam et voluptatem	Sunt error sint omn	Voluptate non nulla	t	2026-05-15 17:54:58.181	2026-05-15 17:54:58.181
\.


ALTER TABLE "public"."Supplier" ENABLE TRIGGER ALL;

--
-- Data for Name: PurchaseOrder; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."PurchaseOrder" DISABLE TRIGGER ALL;

COPY "public"."PurchaseOrder" ("id", "poNumber", "supplierId", "status", "total", "notes", "expectedAt", "receivedAt", "stockReceived", "createdByAdminId", "createdAt", "updatedAt") FROM stdin;
cmp8tzpej0008ifdii0nd1pog	PO1000	cmp77wcg4001h11gauv2xlmta	DRAFT	250.00	\N	\N	\N	f	cmolwsveu0000446nhr4274yx	2026-05-16 21:01:12.667	2026-05-17 13:26:23.3
\.


ALTER TABLE "public"."PurchaseOrder" ENABLE TRIGGER ALL;

--
-- Data for Name: PurchaseOrderItem; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."PurchaseOrderItem" DISABLE TRIGGER ALL;

COPY "public"."PurchaseOrderItem" ("id", "poId", "productId", "name", "sku", "unitCost", "quantity") FROM stdin;
cmp8tzpej000aifdimx1ccvo5	cmp8tzpej0008ifdii0nd1pog	cmooqr83w000112c4xhw7td4n	Brake Caliper Honda CBR 250	BRK-34534345-945	250.00	1
\.


ALTER TABLE "public"."PurchaseOrderItem" ENABLE TRIGGER ALL;

--
-- Data for Name: StockLayer; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."StockLayer" DISABLE TRIGGER ALL;

COPY "public"."StockLayer" ("id", "productId", "sourcePoItemId", "source", "unitCost", "qtyReceived", "qtyRemaining", "receivedAt", "notes", "createdAt", "updatedAt", "unitRetail") FROM stdin;
cmp8rn7rb000712s5myy8fnxn	cmonaix3c000139lyqnfcknp8	\N	INITIAL	120.00	155	155	2026-05-01 19:13:06.077	Backfill: pre-FIFO stock at current costPrice	2026-05-16 19:55:30.695	2026-05-16 20:11:05.194	150.00
cmp8rn7rd000912s59gtv4j3l	cmon8sqhy0005vode0slkft3a	\N	INITIAL	250.00	75	0	2026-05-01 18:24:44.862	Backfill: pre-FIFO stock at current costPrice	2026-05-16 19:55:30.697	2026-05-16 20:39:13.43	330.00
cmpat2ico000hw8epvrdmn9xi	cmon8sqhy0005vode0slkft3a	\N	MANUAL_ADJUSTMENT	270.00	20	20	2026-05-18 06:10:56.232	\N	2026-05-18 06:10:56.233	2026-05-18 06:10:56.233	350.00
cmp8rpwj8000mfrv57yx6cp94	cmon8sqhy0005vode0slkft3a	\N	MANUAL_ADJUSTMENT	260.00	25	0	2026-05-16 19:57:36.115	\N	2026-05-16 19:57:36.116	2026-05-18 06:11:29.61	340.00
cmp8rn7r6000312s5ghgvaptp	cmooqwiul000712c4mpo0rqfo	\N	INITIAL	250.00	600	599	2026-05-02 19:39:20.837	Backfill: pre-FIFO stock at current costPrice	2026-05-16 19:55:30.69	2026-05-18 06:55:19.476	240.00
cmp8rn7r8000512s5xbz7vy93	cmon82hk500057ogkypwrnxil	\N	INITIAL	150.00	1198	1190	2026-05-01 18:04:20.22	Backfill: pre-FIFO stock at current costPrice	2026-05-16 19:55:30.693	2026-05-22 15:15:48.085	200.00
cmp8rn7r2000112s5m7kplzur	cmooqr83w000112c4xhw7td4n	\N	INITIAL	250.00	270	266	2026-05-02 19:35:13.632	Backfill: pre-FIFO stock at current costPrice	2026-05-16 19:55:30.686	2026-05-22 15:17:54.525	300.00
\.


ALTER TABLE "public"."StockLayer" ENABLE TRIGGER ALL;

--
-- Data for Name: OrderItemCostAllocation; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."OrderItemCostAllocation" DISABLE TRIGGER ALL;

COPY "public"."OrderItemCostAllocation" ("id", "orderItemId", "stockLayerId", "qty", "unitCost", "createdAt") FROM stdin;
cmp8t7fh5001dlm8k9olvzvwa	cmp8swrxt0012lm8k4sk40frf	cmp8rn7rd000912s59gtv4j3l	1	250.00	2026-05-16 20:39:13.433
cmpat383w000qw8epuwwm36tx	cmpat383d000ow8epln4nycjr	cmp8rpwj8000mfrv57yx6cp94	1	260.00	2026-05-18 06:11:29.612
cmpaunlbr002uw8epcn3mv3sg	cmpaunlba002rw8epe3r0d4sd	cmp8rn7r6000312s5ghgvaptp	1	250.00	2026-05-18 06:55:19.479
cmpaunlc0002ww8eptwptobkn	cmpaunlba002sw8epg0i8s2s6	cmp8rn7r2000112s5m7kplzur	1	250.00	2026-05-18 06:55:19.488
cmpeiuc38000gjhrq7ztjapdf	cmpeiuc2k000ejhrqe6dmr6u6	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-20 20:35:43.412
cmpfzhgbh000cwvdiee6p59a2	cmpfzhgb0000awvdi076ophvr	cmp8rn7r2000112s5m7kplzur	1	250.00	2026-05-21 21:09:22.013
cmpg0hfiq005gwvdi94jihsex	cmpg0hfic005ewvdim0ql4isa	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-21 21:37:20.594
cmpg0in4r005pwvdixj9cyfk1	cmpg0in4i005nwvdi7n7jywgq	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-21 21:38:17.115
cmpg0mwt4006cwvdi0p6mdso1	cmpg0mwst006awvdi2qqz1ziy	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-21 21:41:36.281
cmpg0se0j007zwvdicokxp3lj	cmpg0se07007xwvdiplaa8i4q	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-21 21:45:51.86
cmpgqw92d0014mfp76963noky	cmpgqw91w0012mfp7b7vwwkfs	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-22 09:56:42.086
cmpgr9y2q001ymfp7gycqowwg	cmpgr9y2f001wmfp7ipc2p02x	cmp8rn7r2000112s5m7kplzur	1	250.00	2026-05-22 10:07:21.026
cmph1j3f1000g12ygcdb9c396	cmph1j3dz000e12ygeb02v2vm	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-22 14:54:24.014
cmph2am7r000w12ygi7zx6h1r	cmph2am7e000u12ygnybcbg21	cmp8rn7r8000512s5xbz7vy93	1	150.00	2026-05-22 15:15:48.087
cmph2dbrz000i548xjmf4ek64	cmph2dbrl000g548x887mmh3d	cmp8rn7r2000112s5m7kplzur	1	250.00	2026-05-22 15:17:54.528
\.


ALTER TABLE "public"."OrderItemCostAllocation" ENABLE TRIGGER ALL;

--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Payment" DISABLE TRIGGER ALL;

COPY "public"."Payment" ("id", "orderId", "userId", "provider", "providerPaymentId", "status", "amount", "currency", "receiptUrl", "failureMessage", "meta", "createdAt", "updatedAt") FROM stdin;
cmpeiuc3n000ijhrq9xxcti6x	cmpeiuc2k000cjhrqbrr1zjoo	cmolwsveu0000446nhr4274yx	stripe	pi_3TZGqBKn5UF7A7Cj1mJh2dxm	PENDING	251.99	gbp	\N	\N	{"intent": "pi_3TZGqBKn5UF7A7Cj1mJh2dxm"}	2026-05-20 20:35:43.427	2026-05-20 20:35:43.427
cmpfzigu1000ywvdi53i6prkg	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZdr3Kn5UF7A7Cj1bYHus7K	PENDING	372.00	gbp	\N	\N	{"intent": "pi_3TZdr3Kn5UF7A7Cj1bYHus7K", "source": "admin-pay-link"}	2026-05-21 21:10:09.338	2026-05-21 21:10:09.338
cmpfzx99d002cwvdiubxn2ojy	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZe2BKn5UF7A7Cj1TAEg22m	PENDING	372.00	gbp	\N	\N	{"intent": "pi_3TZe2BKn5UF7A7Cj1TAEg22m", "source": "admin-pay-link"}	2026-05-21 21:21:39.361	2026-05-21 21:21:39.361
cmpfzy6ba002kwvdimblg75z9	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZe2sKn5UF7A7Cj0d5l1jko	PENDING	372.00	gbp	\N	\N	{"intent": "pi_3TZe2sKn5UF7A7Cj0d5l1jko", "source": "admin-pay-link"}	2026-05-21 21:22:22.198	2026-05-21 21:22:22.198
cmpg03995002swvdil4mq54nw	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZe6hKn5UF7A7Cj0lXON94K	PENDING	372.00	gbp	\N	\N	{"intent": "pi_3TZe6hKn5UF7A7Cj0lXON94K", "source": "admin-pay-link"}	2026-05-21 21:26:19.29	2026-05-21 21:26:19.29
cmpg0496w0030wvdi5z9xwiqj	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZe7SKn5UF7A7Cj0h1YzgBl	PENDING	372.00	gbp	\N	\N	{"intent": "pi_3TZe7SKn5UF7A7Cj0h1YzgBl", "source": "admin-pay-link"}	2026-05-21 21:27:05.864	2026-05-21 21:27:05.864
cmpg08yyd003kwvdi0scoytxv	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZeAzKn5UF7A7Cj1uR1Cif3	PENDING	372.00	gbp	\N	\N	{"intent": "pi_3TZeAzKn5UF7A7Cj1uR1Cif3", "source": "admin-pay-link"}	2026-05-21 21:30:45.877	2026-05-21 21:30:45.877
cmpg09hdm003swvdijl1aj5ui	cmpfzhgb00008wvdig32qnure	cmolwsvf00001446n86sscmn3	stripe	pi_3TZeBNKn5UF7A7Cj12YB3inh	SUCCEEDED	372.00	gbp	https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUkxmejhLbjVVRjdBN0NqKJL1vdAGMgZcEAW9lC06LBasZzXPD27Id-lLJJz_vtLNPtdcmgyuGdsTEaiXr6BN2_-nzcyWiuOSOugY	\N	{"intent": "pi_3TZeBNKn5UF7A7Cj12YB3inh", "chargeId": "ch_3TZeBNKn5UF7A7Cj1WB96WsN"}	2026-05-21 21:31:09.754	2026-05-21 21:35:14.738
cmpg0hfj0005iwvdiojrkzbj0	cmpg0hfic005cwvdixdtcijpy	cmor6mb5z0002an3vat470szb	stripe	pi_3TZeHMKn5UF7A7Cj18M1b9DU	PENDING	227.99	gbp	\N	\N	{"intent": "pi_3TZeHMKn5UF7A7Cj18M1b9DU"}	2026-05-21 21:37:20.604	2026-05-21 21:37:20.604
cmpg0in4y005rwvdi45fand8m	cmpg0in4i005lwvdimv41w5gg	cmor6mb5z0002an3vat470szb	stripe	pi_3TZeIHKn5UF7A7Cj16O7NijV	PENDING	227.99	gbp	\N	\N	{"intent": "pi_3TZeIHKn5UF7A7Cj16O7NijV"}	2026-05-21 21:38:17.122	2026-05-21 21:38:17.122
cmpg0mwte006ewvdi8i3wi1dg	cmpg0mwst0068wvdibxhum9c3	cmor6mb5z0002an3vat470szb	stripe	pi_3TZeLUKn5UF7A7Cj1FO0PStq	SUCCEEDED	227.99	gbp	https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUkxmejhLbjVVRjdBN0NqKKD4vdAGMgab9Qtn3TA6LBYo5X045JkIPpz-BPudO912kIE7TEbvM7_cFSPzgpt-iQvtN9L0e_d9nh9q	\N	{"intent": "pi_3TZeLUKn5UF7A7Cj1FO0PStq", "chargeId": "ch_3TZeLUKn5UF7A7Cj1fwjUvSB"}	2026-05-21 21:41:36.291	2026-05-21 21:41:52.15
cmpg0se0s0081wvdipoi6966m	cmpg0se07007vwvdijkeoqzx5	cmolwsvf00001446n86sscmn3	stripe	pi_3TZePbKn5UF7A7Cj03GmpHjm	SUCCEEDED	251.99	gbp	https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUkxmejhLbjVVRjdBN0NqKPD8vdAGMgYvmiXcNLI6LBYbUeYbaMJrC87gL-hxk7u4isPGoPUrzmIRUOzcOv72-2nofZmyv--BiBcU	\N	{"intent": "pi_3TZePbKn5UF7A7Cj03GmpHjm", "chargeId": "ch_3TZePbKn5UF7A7Cj0VFVeS2f"}	2026-05-21 21:45:51.868	2026-05-21 21:51:44.336
cmpgqw92n0016mfp77nmlgygq	cmpgqw91v0010mfp77nw8oafq	cmolwsvf00001446n86sscmn3	stripe	pi_3TZposKn5UF7A7Cj1HBkz9Lp	PENDING	251.99	gbp	\N	\N	{"intent": "pi_3TZposKn5UF7A7Cj1HBkz9Lp"}	2026-05-22 09:56:42.095	2026-05-22 09:56:42.095
cmpgr9y2x0020mfp7lcyjfrk2	cmpgr9y2f001umfp7t2aws03a	cmolwsvf00001446n86sscmn3	stripe	pi_3TZpzBKn5UF7A7Cj1xZTP2vx	PENDING	360.00	gbp	\N	\N	{"intent": "pi_3TZpzBKn5UF7A7Cj1xZTP2vx"}	2026-05-22 10:07:21.033	2026-05-22 10:07:21.033
cmph1j3fd000i12yg5t4flakv	cmph1j3dz000c12ygi69vj7lq	cmolwsvf00001446n86sscmn3	stripe	pi_3TZuSyKn5UF7A7Cj16VeyQ2R	PENDING	251.99	gbp	\N	\N	{"intent": "pi_3TZuSyKn5UF7A7Cj16VeyQ2R"}	2026-05-22 14:54:24.025	2026-05-22 14:54:24.025
cmph2am80000y12yg6zhd0fet	cmph2am7e000s12yg3rajn9f6	cmolwsvf00001446n86sscmn3	stripe	pi_3TZungKn5UF7A7Cj0zU6W9l9	SUCCEEDED	251.99	gbp	https://pay.stripe.com/receipts/payment/CAcaFwoVYWNjdF8xUkxmejhLbjVVRjdBN0NqKLjmwdAGMgaFEmwyiUM6LBZtZYAd4kuTmJzBFOJ7wKWYxCubyxlkvagHVTtIhHDGFh3Nv6QiYHzIxEjA	\N	{"intent": "pi_3TZungKn5UF7A7Cj0zU6W9l9", "chargeId": "ch_3TZungKn5UF7A7Cj0JcG7d8C"}	2026-05-22 15:15:48.096	2026-05-22 15:16:08.37
cmph2dxxd000y548xs1fszlsl	cmph2dbrk000e548xnw76a8m6	cmolwsvf00001446n86sscmn3	stripe	pi_3TZuqBKn5UF7A7Cj16Ryatun	PENDING	360.00	gbp	\N	\N	{"intent": "pi_3TZuqBKn5UF7A7Cj16Ryatun", "source": "admin-pay-link"}	2026-05-22 15:18:23.233	2026-05-22 15:18:23.233
cmph2dxxe0010548xx0usyfk4	cmph2dbrk000e548xnw76a8m6	cmolwsvf00001446n86sscmn3	stripe	pi_3TZuqBKn5UF7A7Cj1pIHJ1W8	PENDING	360.00	gbp	\N	\N	{"intent": "pi_3TZuqBKn5UF7A7Cj1pIHJ1W8", "source": "admin-pay-link"}	2026-05-22 15:18:23.234	2026-05-22 15:18:23.234
\.


ALTER TABLE "public"."Payment" ENABLE TRIGGER ALL;

--
-- Data for Name: ProductCompatibility; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."ProductCompatibility" DISABLE TRIGGER ALL;

COPY "public"."ProductCompatibility" ("id", "productId", "bikeModelId", "yearFrom", "yearTo", "notes") FROM stdin;
cmon82hk700077ogkbr7sl0hy	cmon82hk500057ogkypwrnxil	cmon7xhuc00027ogkgmb7p094	2020	2026	\N
cmonbbqci000b11fs0q6dfoq4	cmonaix3c000139lyqnfcknp8	cmon7xhuc00027ogkgmb7p094	2020	2025	\N
cmoo7bc7f0002q8wjbwb34j36	cmon8sqhy0005vode0slkft3a	cmon8qcxp0002vodel1pk2v2m	2020	2022	\N
cmovrj7eb002c42f4xz7qzow2	cmooqr83w000112c4xhw7td4n	cmon7xhuc00027ogkgmb7p094	2020	2026	\N
cmovrj7ei002e42f4qv6mtmsz	cmooqr83w000112c4xhw7td4n	cmooqughj000512c44xgztiu6	2020	2023	\N
cmpoc73zl000eylfcg8vv2zzr	cmooqwiul000712c4mpo0rqfo	cmooqughj000512c44xgztiu6	2020	2023	\N
\.


ALTER TABLE "public"."ProductCompatibility" ENABLE TRIGGER ALL;

--
-- Data for Name: TradeAccountRequest; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."TradeAccountRequest" DISABLE TRIGGER ALL;

COPY "public"."TradeAccountRequest" ("id", "userId", "contactName", "email", "phone", "companyName", "companyWebsite", "vatNumber", "businessType", "monthlyVolume", "address", "city", "country", "notes", "status", "decidedAt", "decidedById", "decisionNote", "createdAt", "updatedAt", "addressLine2", "county", "postcode") FROM stdin;
cmoq8fltc00012en0p5gya3zg	\N	Do tempore libero i	becu@mailinator.com	Sapiente commodo lab	Harum vel iusto et u	Commodo eos exercita	Facilis atque culpa	Amet accusantium qu	Vero voluptas velit	Perspiciatis veniam	Enim culpa error ve	Quae labore commodo	Dolore laborum Est	PENDING	\N	\N	\N	2026-05-03 20:37:51.793	2026-05-03 20:37:51.793	\N	\N	\N
cmoq8m6880001xw04a5dmu0vx	\N	Incidunt unde liber	zilekal@mailinator.com	Quod itaque neque co	Ut esse est et Nam	Autem porro ut ex of	Eos harum facilis i	Culpa esse sit ips	Magna natus numquam	Quidem expedita mini	Commodi possimus al	Laboris quia optio	Sunt minima pariatur	APPROVED	2026-05-03 20:44:49.813	cmolwsveu0000446nhr4274yx	\N	2026-05-03 20:42:58.184	2026-05-03 20:44:49.815	\N	\N	\N
cmoq90hqj000725rakvsskqgq	cmoq91dun000f25rauw7c0g7i	Usman Ahmad	usman531509@gmail.com	123456789	webstalentz	wabstalentz.com	4567	workshop	2000	Pattan Road Near Eid Gah Pindi Bhattian	Hafizabad	Pakistan	\N	APPROVED	2026-05-03 20:54:47.819	cmolwsveu0000446nhr4274yx	\N	2026-05-03 20:54:06.283	2026-05-03 20:54:47.906	\N	\N	\N
cmpofv2xg0007124a5kor7wvs	cmolwsveu0000446nhr4274yx	Omnis animi fuga E	pebutukofi@mailinator.com	52535253	Incididunt et tempor	Illo ex cumque dolor	23523	Independent workshop	23523	Est est est magni	Ab optio rerum magn	Porro dolores omnis	Hic et fugit ut ut	REJECTED	2026-05-27 19:15:36.234	cmolwsveu0000446nhr4274yx	\N	2026-05-27 19:10:01.108	2026-05-27 19:15:36.235	Ea rerum esse tempor	Dolore et animi con	2352F
\.


ALTER TABLE "public"."TradeAccountRequest" ENABLE TRIGGER ALL;

--
-- Data for Name: TradeDiscount; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."TradeDiscount" DISABLE TRIGGER ALL;

COPY "public"."TradeDiscount" ("id", "categoryId", "percent", "createdAt", "updatedAt") FROM stdin;
cmor6knsq000a1qm1r1kjn8ep	cmoohu3750000etefl8q81na6	10	2026-05-04 12:33:34.586	2026-05-04 12:33:34.586
cmor6ko90000c1qm15fvdew7z	cmon7xt4l00037ogkl5s89o2z	10	2026-05-04 12:33:35.172	2026-05-04 12:33:35.172
cmor6kozo000e1qm1p0v0vx5w	cmon8qv550003vodeulnr02g8	20	2026-05-04 12:33:36.132	2026-05-04 12:33:36.132
\.


ALTER TABLE "public"."TradeDiscount" ENABLE TRIGGER ALL;

--
-- Data for Name: Wishlist; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."Wishlist" DISABLE TRIGGER ALL;

COPY "public"."Wishlist" ("id", "userId", "createdAt", "updatedAt") FROM stdin;
cmovlslcb00076ek4q0cgflkg	cmolwsveu0000446nhr4274yx	2026-05-07 14:50:43.596	2026-05-07 14:50:43.596
cmpatoiww0019w8ep5s6wdz34	cmolwsvf00001446n86sscmn3	2026-05-18 06:28:03.392	2026-05-18 06:28:03.392
\.


ALTER TABLE "public"."Wishlist" ENABLE TRIGGER ALL;

--
-- Data for Name: WishlistItem; Type: TABLE DATA; Schema: public; Owner: -
--

ALTER TABLE "public"."WishlistItem" DISABLE TRIGGER ALL;

COPY "public"."WishlistItem" ("id", "wishlistId", "productId", "productName", "productSlug", "productPrice", "productImage", "productBrand", "createdAt") FROM stdin;
\.


ALTER TABLE "public"."WishlistItem" ENABLE TRIGGER ALL;

--
-- PostgreSQL database dump complete
--

\unrestrict oC5mgcZWDIRLjLSzVEOCQOwVtEVMw0AQedNRe2enI4qUQzNhHEXd5R9y2beccdh

