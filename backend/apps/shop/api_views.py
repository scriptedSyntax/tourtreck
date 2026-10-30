from django.db.models import Q
from rest_framework import generics, status, viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.api_permissions import IsAdminRole, IsCustomerRole, IsSuperAdminRole

from .models import AdHero, Category, ContactInquiry, ContentPage, HomepageSection, Product, ProductReview, ShopProfile, SiteSetting, WishlistItem
from .serializers import (
    CategorySerializer,
    AdHeroSerializer,
    ContentPageSerializer,
    HomepageSectionSerializer,
    ProductSerializer,
    ProductReviewSerializer,
    PublicSiteSettingSerializer,
    ShopProfileSerializer,
    SiteSettingAdminSerializer,
    NewsletterSubscriberSerializer,
    ContactInquirySerializer,
    WishlistProductSerializer,
)


def normalize_search(value, max_length=80):
    if not value:
        return ""
    cleaned = "".join(char for char in str(value) if char.isprintable())
    cleaned = " ".join(cleaned.split())
    return cleaned[:max_length]


class PublicSiteView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = PublicSiteSettingSerializer

    def get_object(self):
        return generics.get_object_or_404(SiteSetting, is_active=True)


class PublicShopProfileView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ShopProfileSerializer

    def get_object(self):
        return generics.get_object_or_404(ShopProfile)


class PublicHomepageSectionListView(generics.ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = HomepageSectionSerializer
    pagination_class = None
    queryset = HomepageSection.objects.filter(is_active=True).order_by("order", "id")


class PublicAdHeroListView(generics.ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = AdHeroSerializer
    pagination_class = None
    queryset = AdHero.objects.filter(is_active=True).order_by("order", "-created_at")


class NewsletterSubscribeView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = NewsletterSubscriberSerializer
    throttle_scope = "newsletter"


class ContactInquiryCreateView(generics.CreateAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ContactInquirySerializer
    throttle_scope = "contact"
    queryset = ContactInquiry.objects.all()


class PublicContentPageListView(generics.ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ContentPageSerializer
    pagination_class = None
    queryset = ContentPage.objects.filter(is_active=True).order_by("order", "title")


class PublicContentPageDetailView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ContentPageSerializer
    lookup_field = "slug"
    queryset = ContentPage.objects.filter(is_active=True)


class PublicCategoryListView(generics.ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = CategorySerializer
    pagination_class = None
    queryset = Category.objects.filter(is_active=True).order_by("name")


class PublicProductListView(generics.ListAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ProductSerializer

    def get_queryset(self):
        queryset = Product.objects.filter(
            is_active=True,
            category__is_active=True,
        ).select_related("category").prefetch_related("images")
        category = self.request.query_params.get("category")
        featured = self.request.query_params.get("featured")
        search = normalize_search(self.request.query_params.get("search"))
        if category:
            if category.isdigit():
                queryset = queryset.filter(Q(category_id=category) | Q(category__parent_id=category))
            else:
                queryset = queryset.filter(Q(category__slug=category) | Q(category__parent__slug=category))
        if featured and featured.lower() in {"1", "true", "yes"}:
            queryset = queryset.filter(is_featured=True)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(description__icontains=search)
            )
        return queryset


class PublicProductDetailView(generics.RetrieveAPIView):
    permission_classes = (AllowAny,)
    serializer_class = ProductSerializer
    lookup_field = "slug"
    queryset = Product.objects.filter(
        is_active=True,
        category__is_active=True,
    ).select_related("category").prefetch_related("images")


class ProductReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductReviewSerializer
    pagination_class = None
    throttle_scope = "review"

    def get_product(self):
        return generics.get_object_or_404(Product, slug=self.kwargs["slug"], is_active=True)

    def get_queryset(self):
        return ProductReview.objects.filter(product=self.get_product(), is_approved=True).select_related("customer")

    def get_permissions(self):
        return [AllowAny()] if self.request.method == "GET" else [IsCustomerRole()]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["product"] = self.get_product()
        return context

    def perform_create(self, serializer):
        serializer.save(product=self.get_product(), customer=self.request.user)


class ProductReviewEligibilityView(APIView):
    permission_classes = (IsCustomerRole,)

    def get(self, request, slug):
        from apps.orders.models import OrderItem

        product = generics.get_object_or_404(Product, slug=slug, is_active=True)
        already_reviewed = ProductReview.objects.filter(product=product, customer=request.user).exists()
        delivered_purchase = OrderItem.objects.filter(
            order__customer=request.user,
            order__status="DELIVERED",
            product=product,
        ).exists()
        return Response({
            "can_review": delivered_purchase and not already_reviewed,
            "already_reviewed": already_reviewed,
            "delivered_purchase": delivered_purchase,
        })


class CustomerWishlistView(APIView):
    permission_classes = (IsCustomerRole,)

    def wishlist_response(self, request, status_code=status.HTTP_200_OK):
        products = Product.objects.filter(
            wishlist_items__customer=request.user,
            is_active=True,
            category__is_active=True,
        ).select_related("category").prefetch_related("images").order_by("-wishlist_items__created_at")
        return Response(
            {
                "product_ids": [product.id for product in products],
                "products": ProductSerializer(products, many=True, context={"request": request}).data,
            },
            status=status_code,
        )

    def get(self, request):
        return self.wishlist_response(request)

    def post(self, request):
        serializer = WishlistProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = generics.get_object_or_404(
            Product,
            pk=serializer.validated_data["product_id"],
            is_active=True,
            category__is_active=True,
        )
        WishlistItem.objects.get_or_create(customer=request.user, product=product)
        return self.wishlist_response(request, status.HTTP_201_CREATED)

    def delete(self, request):
        serializer = WishlistProductSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product_id = serializer.validated_data["product_id"]
        WishlistItem.objects.filter(customer=request.user, product_id=product_id).delete()
        return self.wishlist_response(request)


class AdminCategoryViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminRole,)
    serializer_class = CategorySerializer
    queryset = Category.objects.all().order_by("name")


class AdminProductViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAdminRole,)
    serializer_class = ProductSerializer
    queryset = Product.objects.select_related("category").prefetch_related("images")


class AdminSiteSettingView(generics.RetrieveUpdateAPIView):
    permission_classes = (IsSuperAdminRole,)
    serializer_class = SiteSettingAdminSerializer

    def get_object(self):
        return generics.get_object_or_404(SiteSetting)
