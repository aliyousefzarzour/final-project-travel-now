# Bugfix Requirements Document

## Introduction

صفحة الـ Payments في لوحة تحكم الأدمن تظهر "No payments found" و "0 records" رغم أن المستخدمين يُكملون عمليات الدفع بنجاح. المشكلة هي أن صفحة الدفع في الـ frontend (`pages/payment.html`) تحفظ الـ Booking فقط عبر `POST /api/bookings`، لكنها **لا تستدعي أبداً** `POST /api/payments/confirm` — أي أن جدول الـ `Payment` في قاعدة البيانات يبقى فارغاً تماماً. الأدمن يُفترض أن يرى كل Transaction بتفاصيلها الكاملة (Transaction ID, Customer, Contact, Booking, Card, Amount, Status, Date).

---

## Bug Analysis

### Current Behavior (Defect)

ما يحدث حالياً عندما يُكمل المستخدم عملية الدفع:

1.1 WHEN يملأ المستخدم بيانات البطاقة ويضغط "CONFIRM BOOKING" في `pages/payment.html` THEN النظام يُرسل طلب `POST /api/bookings` فقط ولا يُرسل أي طلب لـ `POST /api/payments/confirm`

1.2 WHEN يفتح الأدمن قسم Payments في لوحة التحكم THEN النظام يعرض "No payments found" و "0 records" لأن collection الـ `Payment` فارغة تماماً في قاعدة البيانات

1.3 WHEN يُرسل الأدمن طلب `GET /api/admin/payments` THEN النظام يُعيد مصفوفة فارغة `{ payments: [] }` لأنه لا يوجد أي document محفوظ في الـ Payment model

### Expected Behavior (Correct)

ما يجب أن يحدث بعد الإصلاح:

2.1 WHEN يُكمل المستخدم عملية الدفع بنجاح في `pages/payment.html` THEN النظام SHALL يُرسل طلب `POST /api/payments/confirm` بعد إنشاء الـ Booking، يحتوي على `transactionId` و `bookingId` و `cardBrand` و `cardLast4` و `amount`

2.2 WHEN يُرسل الـ frontend طلب `POST /api/payments/confirm` بالبيانات الصحيحة THEN النظام SHALL يحفظ document جديد في collection الـ `Payment` بجميع حقوله (userId, bookingId, transactionId, cardBrand, cardLast4, amount, status, currency)

2.3 WHEN يفتح الأدمن قسم Payments في لوحة التحكم THEN النظام SHALL يعرض جميع الـ payments المحفوظة في الجدول مع بياناتها الكاملة: Transaction ID, Customer, Contact, Booking, Card, Amount, Status, Date

2.4 WHEN يعرض الجدول الـ payments THEN النظام SHALL يعرض عدد الـ records الصحيح في badge الـ "X records" بدلاً من "0 records"

### Unchanged Behavior (Regression Prevention)

السلوكيات الموجودة التي يجب أن تبقى كما هي بعد الإصلاح:

3.1 WHEN يُكمل المستخدم الدفع THEN النظام SHALL CONTINUE TO إنشاء الـ Booking عبر `POST /api/bookings` وعرض رسالة نجاح "BOOKING CONFIRMED!" كما هو الحال الآن

3.2 WHEN تفشل عملية حفظ الـ Payment (خطأ في الشبكة أو الـ backend) THEN النظام SHALL CONTINUE TO إتمام الـ Booking وعرض رسالة نجاح للمستخدم (الـ payment غير مطلوبة لتأكيد الـ booking)

3.3 WHEN يعمل المشروع في "demo mode" بدون backend THEN النظام SHALL CONTINUE TO محاكاة عملية الدفع وعرض رسالة النجاح دون الحاجة لاتصال حقيقي بالـ backend

3.4 WHEN يفتح الأدمن أي قسم آخر في اللوحة (Users, Bookings, Companies, إلخ) THEN النظام SHALL CONTINUE TO عرض بياناته بشكل طبيعي دون تأثر

3.5 WHEN يبحث الأدمن في جدول الـ Payments عبر حقل البحث THEN النظام SHALL CONTINUE TO تصفية النتائج بناءً على الاسم أو الـ ID كما هو موجود حالياً

---

## Bug Condition (Pseudocode)

**Bug Condition Function** — يُحدد متى يُصاب النظام بالمشكلة:

```pascal
FUNCTION isBugCondition(request)
  INPUT: request of type PaymentFormSubmission
  OUTPUT: boolean
  
  // البيئة المعطوبة: لا يوجد استدعاء لـ /api/payments/confirm بعد إنشاء الـ booking
  RETURN request.callsPaymentConfirmAPI = false
         AND request.callsBookingAPI = true
END FUNCTION
```

**Property: Fix Checking**

```pascal
FOR ALL submission WHERE isBugCondition(submission) DO
  result ← processPayment'(submission)
  ASSERT paymentDocumentSavedInDB(result) = true
  AND adminCanSeePaymentInPanel(result) = true
END FOR
```

**Property: Preservation Checking**

```pascal
FOR ALL submission WHERE NOT isBugCondition(submission) DO
  ASSERT F(submission) = F'(submission)
  // أي: إنشاء الـ Booking وعرض رسالة النجاح يعملان كما كانا دائماً
END FOR
```
