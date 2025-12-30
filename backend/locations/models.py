from django.db import models

class Sector(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name


class Cell(models.Model):
    name = models.CharField(max_length=100)
    sector = models.ForeignKey(Sector, on_delete=models.CASCADE, related_name='cells')

    def __str__(self):
        return f"{self.name} ({self.sector.name})"


class Village(models.Model):
    name = models.CharField(max_length=100)
    cell = models.ForeignKey(Cell, on_delete=models.CASCADE, related_name='villages')

    def __str__(self):
        return f"{self.name} ({self.cell.name})"
