from django.urls import path

from .api_views import (
    PublicCategoryListView,
    PublicAdHeroListView,
    PublicContentPageDetailView,
    PublicContentPageListView,
    PublicHomepageSectionListView,
    PublicProductDetailView,
    PublicProductListView,
    ProductReviewListCreateView,
    PublicShopProfileView,
    PublicSiteView,
    NewsletterSubscribeView,
    ContactInquiryCreateView,
    ProductReviewEligibilityView,
)


urlpatterns = [
    path("site/", PublicSiteView.as_view(), name="public-site"),
    path("profile/", PublicShopProfileView.as_view(), name="public-shop-profile"),
    path("homepage-sections/", PublicHomepageSectionListView.as_view(), name="public-homepage-sections"),
    path("ad-heroes/", PublicAdHeroListView.as_view(), name="public-ad-heroes"),
    path("newsletter/", NewsletterSubscribeView.as_view(), name="newsletter-subscribe"),
    path("contact-inquiries/", ContactInquiryCreateView.as_view(), name="contact-inquiry-create"),
    path("content/", PublicContentPageListView.as_view(), name="public-content-list"),
    path("content/<slug:slug>/", PublicContentPageDetailView.as_view(), name="public-content-detail"),
    path("categories/", PublicCategoryListView.as_view(), name="public-categories"),
    path("products/", PublicProductListView.as_view(), name="public-products"),
    path("products/<slug:slug>/", PublicProductDetailView.as_view(), name="public-product-detail"),
    path("products/<slug:slug>/reviews/", ProductReviewListCreateView.as_view(), name="product-reviews"),
    path("products/<slug:slug>/review-eligibility/", ProductReviewEligibilityView.as_view(), name="product-review-eligibility"),
]
