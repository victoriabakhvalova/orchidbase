from django.db import models
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings



class Orchid(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orchids',
        null=True, blank=True
    )
    name = models.CharField(max_length=255, blank=True)
    genus = models.JSONField(default=list, blank=True)
    farm = models.JSONField(default=list, blank=True)
    seller = models.JSONField(default=list, blank=True)
    date_arrived = models.DateField(null=True, blank=True)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True,blank=True)
    bloom_dates = models.JSONField(default=list, blank=True)
    repot_dates = models.JSONField(default=list, blank=True)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    is_dead = models.BooleanField(default=False)


    def __str__(self):
        return self.name or f"Orchid #{self.id}"

class OrchidPhoto(models.Model):
    orchid = models.ForeignKey(Orchid, related_name="photos", on_delete=models.CASCADE)
    image = models.ImageField(upload_to='orchid_photos/')
    description = models.CharField(max_length=225, blank=True)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Photo for {self.orchid.name}"

class Preorder(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='preorders',
        null=True, blank=True
    )
    name = models.CharField(max_length=255, blank=True)
    genus = models.JSONField(default=list, blank=True)
    farm = models.JSONField(default=list, blank=True)
    seller = models.JSONField(default=list, blank=True)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expected_arrival = models.DateField(null=True, blank=True)
    paid = models.BooleanField(default=False)
    paid_from_credit_card = models.BooleanField(default=False)
    no_credit_card_debt = models.BooleanField(default=False)
    date_ordered = models.DateField(default=timezone.now)
    arrived = models.BooleanField(default=False)
    archived = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Preorder:{self.name}"


@receiver(post_save, sender=Preorder)
def move_to_orchid(sender, instance, created, **kwargs):
    """
    Если отметили, что заказ приехал и он ещё не заархивирован — переносим в Orchid.
    Плюс защита от дублей на случай двойного сохранения.
    """
    if instance.arrived and not instance.archived:
        today = timezone.now().date()
        already = Orchid.objects.filter(
            owner=instance.owner,
            name=instance.name,
            date_arrived=today
        ).exists()
        if not already:
            Orchid.objects.create(
                owner=instance.owner,
                name=instance.name,
                genus=instance.genus,
                farm=instance.farm,
                seller=instance.seller,
                price_usd=instance.price_usd,
                date_arrived=today
            )
        instance.archived = True
        instance.save(update_fields=["archived"])






