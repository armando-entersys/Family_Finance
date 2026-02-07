"""
Transaction endpoints: CRUD operations for financial transactions.
"""

import math
from typing import Optional
import uuid

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from src.api.v1.dependencies import CurrentUser, DbSession
from src.domain.schemas import (
    TransactionCreate,
    TransactionFilter,
    TransactionList,
    TransactionResponse,
    TransactionUpdate,
)
from src.services.trx_service import TransactionService
from src.services.storage_service import StorageService

router = APIRouter(prefix="/transactions", tags=["Transactions"])


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionResponse:
    """Create a new transaction."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = TransactionService(db)
    transaction = await service.create_transaction(
        data=data,
        family_id=current_user.family_id,
        user_id=current_user.id,
    )

    return transaction


@router.get("", response_model=TransactionList)
async def list_transactions(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    type: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    user_id: Optional[uuid.UUID] = Query(None),
) -> TransactionList:
    """List transactions with filtering and pagination."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    # Build filter
    filters = TransactionFilter(
        type=type,
        category_id=category_id,
        search=search,
        user_id=user_id,
    )

    service = TransactionService(db)
    transactions, total = await service.list_transactions(
        family_id=current_user.family_id,
        filters=filters,
        page=page,
        size=size,
    )

    return TransactionList(
        items=transactions,
        total=total,
        page=page,
        size=size,
        pages=math.ceil(total / size) if total > 0 else 0,
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionResponse:
    """Get a specific transaction."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = TransactionService(db)
    transaction = await service.get_transaction(
        transaction_id=transaction_id,
        family_id=current_user.family_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    return transaction


@router.patch("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: uuid.UUID,
    data: TransactionUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> TransactionResponse:
    """Update a transaction."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = TransactionService(db)
    transaction = await service.get_transaction(
        transaction_id=transaction_id,
        family_id=current_user.family_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    updated = await service.update_transaction(transaction, data)
    return updated


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a transaction."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    service = TransactionService(db)
    transaction = await service.get_transaction(
        transaction_id=transaction_id,
        family_id=current_user.family_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    await service.delete_transaction(transaction)


@router.post("/{transaction_id}/attachment", response_model=TransactionResponse)
async def upload_attachment(
    transaction_id: uuid.UUID,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
) -> TransactionResponse:
    """
    Upload an attachment (receipt photo) for a transaction.
    Compresses to WebP and uploads to GCS.
    """
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must belong to a family",
        )

    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed",
        )

    trx_service = TransactionService(db)
    transaction = await trx_service.get_transaction(
        transaction_id=transaction_id,
        family_id=current_user.family_id,
    )

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found",
        )

    # Upload to GCS
    storage = StorageService()
    file_content = await file.read()

    url, thumb_url = await storage.upload_transaction_image(
        file_content=file_content,
        family_id=str(current_user.family_id),
        transaction_id=str(transaction_id),
    )

    # Update transaction
    updated = await trx_service.update_attachment(
        transaction=transaction,
        attachment_url=url,
        thumb_url=thumb_url,
    )

    return updated
